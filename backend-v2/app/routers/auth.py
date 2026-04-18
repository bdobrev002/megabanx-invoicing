"""Auth router: register, login (OTP), verify, me, logout."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, Session, TosConsent
from app.models.profile import Profile
from app.models.billing import Billing
from app.schemas.auth import RegisterRequest, LoginRequest, VerifyCodeRequest
from app.services.auth_service import generate_otp, store_otp, verify_otp, generate_session_token
from app.services.email_service import send_otp_email
from app.services.file_manager import ensure_profile_dirs

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

    # Generate and send OTP
    code = generate_otp()
    store_otp(email, code)
    send_otp_email(email, code)

    await db.flush()

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
    send_otp_email(email, code)

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

    # Create session
    token = generate_session_token()
    session = Session(token=token, user_id=user.id)
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
        max_age=60 * 60 * 24 * 30,  # 30 days
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
        },
    }


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Return the current authenticated user."""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "profile_id": user.profile_id,
        "is_admin": user.is_admin,
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
