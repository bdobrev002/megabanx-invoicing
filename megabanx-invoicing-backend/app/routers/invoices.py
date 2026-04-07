import uuid
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.invoice import Invoice, DocumentType, InvoiceStatus
from app.models.invoice_line import InvoiceLine
from app.models.client import Client
from app.models.company import Company
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse,
    InvoiceListResponse, InvoiceSendEmail, InvoiceLineResponse,
)
from app.services.pdf_generator import generate_invoice_pdf
from app.services.email_service import send_invoice_email

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


def calculate_line_total(quantity: Decimal, unit_price: Decimal) -> Decimal:
    return (quantity * unit_price).quantize(Decimal("0.01"))


def calculate_invoice_totals(lines: list, vat_rate: Decimal, no_vat: bool):
    subtotal = sum(line.line_total for line in lines)
    if no_vat:
        vat_amount = Decimal("0.00")
    else:
        vat_amount = (subtotal * vat_rate / Decimal("100")).quantize(Decimal("0.01"))
    total = subtotal + vat_amount
    return subtotal, vat_amount, total


@router.get("/next-number")
async def get_next_number(
    company_id: uuid.UUID,
    document_type: str = "invoice",
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.coalesce(func.max(Invoice.invoice_number), 0))
        .where(
            and_(
                Invoice.company_id == company_id,
                Invoice.document_type == document_type,
                Invoice.is_deleted == False,
            )
        )
    )
    max_number = result.scalar()
    return {"next_number": max_number + 1}


@router.post("", response_model=InvoiceResponse)
async def create_invoice(data: InvoiceCreate, db: AsyncSession = Depends(get_db)):
    # Verify company and client exist
    company = await db.get(Company, data.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    client = await db.get(Client, data.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Auto-generate invoice number if not provided, with retry on conflict
    invoice_number = data.invoice_number
    max_retries = 3
    for attempt in range(max_retries):
        if invoice_number is None or attempt > 0:
            result = await db.execute(
                select(func.coalesce(func.max(Invoice.invoice_number), 0))
                .where(
                    and_(
                        Invoice.company_id == data.company_id,
                        Invoice.document_type == data.document_type,
                        Invoice.is_deleted == False,
                    )
                )
                .with_for_update()
            )
            invoice_number = result.scalar() + 1

        try:
            # Create invoice
            invoice = Invoice(
                company_id=data.company_id,
                client_id=data.client_id,
                document_type=data.document_type,
                invoice_number=invoice_number,
                issue_date=data.issue_date or date.today(),
                tax_event_date=data.tax_event_date or date.today(),
                due_date=data.due_date,
                status=data.status,
                vat_rate=data.vat_rate,
                no_vat=data.no_vat,
                no_vat_reason=data.no_vat_reason,
                payment_method=data.payment_method,
                notes=data.notes,
                internal_notes=data.internal_notes,
                currency=data.currency,
            )
            db.add(invoice)
            await db.flush()

            # Create line items
            for i, line_data in enumerate(data.lines):
                line_total = calculate_line_total(line_data.quantity, line_data.unit_price)
                line = InvoiceLine(
                    invoice_id=invoice.id,
                    item_id=line_data.item_id,
                    position=line_data.position if line_data.position is not None else i,
                    description=line_data.description,
                    quantity=line_data.quantity,
                    unit=line_data.unit,
                    unit_price=line_data.unit_price,
                    vat_rate=line_data.vat_rate,
                    line_total=line_total,
                )
                db.add(line)

            await db.flush()
            await db.refresh(invoice)

            # Calculate totals
            subtotal, vat_amount, total = calculate_invoice_totals(
                invoice.lines, data.vat_rate, data.no_vat
            )
            invoice.subtotal = subtotal
            invoice.vat_amount = vat_amount
            invoice.total = total

            await db.commit()
            await db.refresh(invoice)

            response = InvoiceResponse.model_validate(invoice)
            response.client_name = client.name
            response.company_name = company.name
            return response
        except IntegrityError:
            await db.rollback()
            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=409,
                    detail="Could not generate unique invoice number. Please try again.",
                )
            invoice_number = None  # Force re-read on next attempt


@router.get("/stats")
async def get_dashboard_stats(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics for a company."""
    today = date.today()
    first_of_month = today.replace(day=1)

    # Count invoices
    total_result = await db.execute(
        select(func.count())
        .select_from(Invoice)
        .where(
            and_(
                Invoice.company_id == company_id,
                Invoice.is_deleted == False,
                Invoice.document_type == "invoice",
            )
        )
    )
    total_invoices = total_result.scalar()

    # Monthly total
    monthly_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(
            and_(
                Invoice.company_id == company_id,
                Invoice.is_deleted == False,
                Invoice.document_type == "invoice",
                Invoice.issue_date >= first_of_month,
            )
        )
    )
    monthly_total = monthly_result.scalar()

    # Unpaid invoices
    unpaid_result = await db.execute(
        select(func.count(), func.coalesce(func.sum(Invoice.total), 0))
        .where(
            and_(
                Invoice.company_id == company_id,
                Invoice.is_deleted == False,
                Invoice.document_type == "invoice",
                Invoice.status.in_(["issued", "overdue"]),
            )
        )
    )
    unpaid_row = unpaid_result.one()
    unpaid_count = unpaid_row[0]
    unpaid_total = unpaid_row[1]

    return {
        "total_invoices": total_invoices,
        "monthly_total": float(monthly_total),
        "unpaid_count": unpaid_count,
        "unpaid_total": float(unpaid_total),
    }


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    company_id: uuid.UUID | None = None,
    document_type: str | None = None,
    status: str | None = None,
    client_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Invoice).where(Invoice.is_deleted == False)

    if company_id:
        query = query.where(Invoice.company_id == company_id)
    if document_type:
        query = query.where(Invoice.document_type == document_type)
    if status:
        query = query.where(Invoice.status == status)
    if client_id:
        query = query.where(Invoice.client_id == client_id)
    if date_from:
        query = query.where(Invoice.issue_date >= date_from)
    if date_to:
        query = query.where(Invoice.issue_date <= date_to)
    if search:
        search_term = f"%{search}%"
        query = query.join(Client).where(
            Client.name.ilike(search_term)
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Invoice.issue_date.desc(), Invoice.invoice_number.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    invoices = result.scalars().all()

    invoice_responses = []
    for inv in invoices:
        resp = InvoiceResponse.model_validate(inv)
        if inv.client:
            resp.client_name = inv.client.name
        if inv.company:
            resp.company_name = inv.company.name
        invoice_responses.append(resp)

    return InvoiceListResponse(
        invoices=invoice_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice or invoice.is_deleted:
        raise HTTPException(status_code=404, detail="Invoice not found")
    resp = InvoiceResponse.model_validate(invoice)
    if invoice.client:
        resp.client_name = invoice.client.name
    if invoice.company:
        resp.company_name = invoice.company.name
    return resp


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: uuid.UUID, data: InvoiceUpdate, db: AsyncSession = Depends(get_db)
):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice or invoice.is_deleted:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = data.model_dump(exclude_unset=True, exclude={"lines"})
    for key, value in update_data.items():
        setattr(invoice, key, value)

    # Update lines if provided
    if data.lines is not None:
        # Delete existing lines
        for line in list(invoice.lines):
            await db.delete(line)
        await db.flush()

        # Create new lines
        for i, line_data in enumerate(data.lines):
            line_total = calculate_line_total(line_data.quantity, line_data.unit_price)
            line = InvoiceLine(
                invoice_id=invoice.id,
                item_id=line_data.item_id,
                position=line_data.position if line_data.position is not None else i,
                description=line_data.description,
                quantity=line_data.quantity,
                unit=line_data.unit,
                unit_price=line_data.unit_price,
                vat_rate=line_data.vat_rate,
                line_total=line_total,
            )
            db.add(line)

        await db.flush()
        await db.refresh(invoice)

    # Recalculate totals when lines, vat_rate, or no_vat changed
    should_recalculate = data.lines is not None or data.vat_rate is not None or data.no_vat is not None
    if should_recalculate:
        vat_rate = data.vat_rate if data.vat_rate is not None else invoice.vat_rate
        no_vat = data.no_vat if data.no_vat is not None else invoice.no_vat
        subtotal, vat_amount, total = calculate_invoice_totals(
            invoice.lines, vat_rate, no_vat
        )
        invoice.subtotal = subtotal
        invoice.vat_amount = vat_amount
        invoice.total = total

    await db.commit()
    await db.refresh(invoice)

    resp = InvoiceResponse.model_validate(invoice)
    if invoice.client:
        resp.client_name = invoice.client.name
    if invoice.company:
        resp.company_name = invoice.company.name
    return resp


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.is_deleted = True
    await db.commit()
    return {"detail": "Invoice deleted"}


@router.get("/{invoice_id}/pdf")
async def get_invoice_pdf(invoice_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice or invoice.is_deleted:
        raise HTTPException(status_code=404, detail="Invoice not found")

    pdf_path = await generate_invoice_pdf(invoice)
    invoice.pdf_path = pdf_path
    await db.commit()

    doc_type = "Фактура" if invoice.document_type == "invoice" else "Проформа"
    filename = f"{doc_type}_{invoice.invoice_number}.pdf"
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=filename,
    )


@router.post("/{invoice_id}/send-email")
async def send_email(
    invoice_id: uuid.UUID,
    data: InvoiceSendEmail,
    db: AsyncSession = Depends(get_db),
):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice or invoice.is_deleted:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Generate PDF first
    pdf_path = await generate_invoice_pdf(invoice)
    invoice.pdf_path = pdf_path
    await db.commit()

    # Send email
    doc_type = "Фактура" if invoice.document_type == "invoice" else "Проформа"
    default_subject = f"{doc_type} №{invoice.invoice_number} от {invoice.company.name}"
    default_message = (
        f"Здравейте,\n\n"
        f"Приложена е {doc_type.lower()} №{invoice.invoice_number} "
        f"от дата {invoice.issue_date.strftime('%d.%m.%Y')} г.\n"
        f"Сума за плащане: {invoice.total:.2f} {invoice.currency}\n\n"
        f"Поздрави,\n{invoice.company.name}"
    )

    await send_invoice_email(
        recipient=data.recipient_email,
        subject=data.subject or default_subject,
        body=data.message or default_message,
        pdf_path=pdf_path,
        pdf_filename=f"{doc_type}_{invoice.invoice_number}.pdf",
    )

    return {"detail": "Email sent successfully"}
