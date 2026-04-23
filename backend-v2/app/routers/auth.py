"""Auth router: register, login (OTP), verify, me, logout."""

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.billing import Billing, InvoiceMonthlyUsage
from app.models.company import Company
from app.models.profile import Profile
from app.models.sharing import CompanyShare
from app.models.user import Session, TosConsent, User
from app.schemas.auth import LoginRequest, ProfileUpdateRequest, RegisterRequest, VerifyCodeRequest
from app.services.auth_service import generate_otp, generate_session_token, store_otp, verify_otp
from app.services.email_service import send_otp_email
from app.services.file_manager import ensure_profile_dirs
from app.services.plans import build_subscription_info

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(req: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Register a new user and send OTP code."""
    email = req.email.strip().lower()

    # Check if user already exists
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Потребител с този имейл вече съществува. Моля, влезте.")

    if not req.tos_accepted:
        raise HTTPException(status_code=400, detail="Трябва да приемете Общите условия")

    # Create profile
    profile_id = str(uuid.uuid4())
    profile = Profile(id=profile_id, name=req.name.strip())
    db.add(profile)

    # Create user
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        name=req.name.strip(),
        email=email,
        profile_id=profile_id,
    )
    db.add(user)

    # Create billing record (free plan)
    billing = Billing(user_id=user_id, plan="free", invoices_limit=30)
    db.add(billing)

    # TOS consent
    tos = TosConsent(
        email=email,
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("User-Agent", ""),
        consent_type="registration",
    )
    db.add(tos)

    # Ensure profile directories on disk
    ensure_profile_dirs(profile_id)

    # Auto-link any pending company shares sent to this email before registration.
    pending_shares = (
        (
            await db.execute(
                select(CompanyShare).where(
                    CompanyShare.shared_with_email == email,
                    CompanyShare.shared_with_user_id == "",
                )
            )
        )
        .scalars()
        .all()
    )
    for share in pending_shares:
        share.shared_with_user_id = user_id

    await db.flush()

    # Generate and send OTP (after DB success)
    code = generate_otp()
    store_otp(email, code)
    await send_otp_email(email, code)

    return {
        "message": "Регистрацията е успешна. Изпратен е код за потвърждение на имейла ви.",
        "email": email,
    }


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Send OTP code to existing user."""
    email = req.email.strip().lower()

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Не е намерен потребител с този имейл. Моля, регистрирайте се.")

    code = generate_otp()
    store_otp(email, code)
    await send_otp_email(email, code)

    return {"message": "Кодът е изпратен на имейла ви.", "email": email}


@router.post("/verify")
async def verify_code(req: VerifyCodeRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Verify OTP code and create session."""
    email = req.email.strip().lower()
    code = req.code.strip()

    try:
        verify_otp(email, code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Find user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Потребителят не е намерен")

    # Create session (6-month expiry to match cookie max_age)
    token = generate_session_token()
    session = Session(
        token=token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=180),
    )
    db.add(session)

    # Ensure profile dirs exist
    ensure_profile_dirs(user.profile_id)

    await db.flush()

    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 180,  # 6 months
    )

    return {
        "message": "Успешен вход",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "profile_id": user.profile_id,
            "is_admin": user.is_admin,
            "subscription": await _subscription_for(user, db),
        },
    }


async def _subscription_for(user: User, db: AsyncSession) -> dict:
    """Assemble the SubscriptionInfo payload expected by the frontend.

    Reads the user's `billing` row (plan, trial/subscription window) and
    attaches the current usage numbers (companies in the user's profile +
    monthly invoice count).
    """
    billing_row = (await db.execute(select(Billing).where(Billing.user_id == user.id))).scalar_one_or_none()

    companies_count = (await db.execute(select(func.count(Company.id)).where(Company.profile_id == user.profile_id))).scalar_one() or 0

    now = datetime.utcnow()
    usage_row = (
        await db.execute(
            select(InvoiceMonthlyUsage).where(
                InvoiceMonthlyUsage.user_id == user.id,
                InvoiceMonthlyUsage.year == now.year,
                InvoiceMonthlyUsage.month == now.month,
            )
        )
    ).scalar_one_or_none()
    invoices_count = usage_row.count if usage_row else 0

    return build_subscription_info(billing_row, int(companies_count), int(invoices_count))


@router.get("/me")
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current authenticated user with subscription metadata."""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "profile_id": user.profile_id,
        "is_admin": user.is_admin,
        "subscription": await _subscription_for(user, db),
    }


@router.put("/me")
async def update_me(
    req: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's display name. Email changes are intentionally
    not supported here — they would require a fresh OTP round-trip and cascade
    updates, which is out of scope for Stage 6A."""
    name = (req.name or "").strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Името трябва да е поне 2 символа")
    if len(name) > 255:
        raise HTTPException(status_code=400, detail="Името е твърде дълго")
    user.name = name
    await db.flush()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "profile_id": user.profile_id,
        "is_admin": user.is_admin,
        "subscription": await _subscription_for(user, db),
    }


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Invalidate current session."""
    token = request.cookies.get("session_token", "")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if token:
        result = await db.execute(select(Session).where(Session.token == token))
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)

    response.delete_cookie("session_token")
    return {"message": "Успешно излизане"}
