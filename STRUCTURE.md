# MegaBanx Invoicing - Project Structure

## Overview

MegaBanx Invoicing is a full-stack invoicing module built with **FastAPI** (backend) and **React + Vite** (frontend). It supports creating invoices, proforma invoices, debit notes, and credit notes with PDF generation, email sending, and Bulgarian Trade Registry (BRRA) integration.

## Repository Layout

```
megabanx-invoicing/
├── megabanx-invoicing-backend/    # FastAPI backend (Python)
├── megabanx-invoicing-frontend/   # React frontend (TypeScript + Vite)
├── STRUCTURE.md                   # This file
├── README.md                      # Project overview
└── .gitignore
```

---

## Backend (`megabanx-invoicing-backend/`)

### Tech Stack
- **Python 3.12+** with **FastAPI**
- **SQLAlchemy** ORM with **PostgreSQL**
- **Poetry** for dependency management
- **WeasyPrint** for PDF generation
- **Jinja2** for PDF HTML templates

### Directory Structure

```
megabanx-invoicing-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point, CORS, router registration
│   ├── config.py             # Environment config (DATABASE_URL, SMTP, etc.)
│   ├── database.py           # SQLAlchemy engine, session, Base
│   ├── models/               # SQLAlchemy ORM models
│   │   ├── __init__.py       # Re-exports all models
│   │   ├── company.py        # Company model (issuer company settings)
│   │   ├── client.py         # Client model (counterparties/customers)
│   │   ├── invoice.py        # Invoice model (all document types)
│   │   ├── invoice_line.py   # InvoiceLine model (line items on invoices)
│   │   ├── item.py           # Item model (articles/products catalog)
│   │   └── number_set.py     # NumberSet model (invoice numbering ranges)
│   ├── schemas/              # Pydantic schemas for request/response validation
│   │   ├── __init__.py
│   │   ├── company.py        # CompanyCreate, CompanyUpdate, CompanyOut
│   │   ├── client.py         # ClientCreate, ClientUpdate, ClientOut
│   │   ├── invoice.py        # InvoiceCreate, InvoiceUpdate, InvoiceOut, InvoiceLineSchema
│   │   └── item.py           # ItemCreate, ItemUpdate, ItemOut
│   ├── routers/              # API route handlers
│   │   ├── __init__.py
│   │   ├── companies.py      # /api/companies - CRUD for issuer company
│   │   ├── clients.py        # /api/clients - CRUD for clients/counterparties
│   │   ├── invoices.py       # /api/invoices - CRUD, PDF generation, email, bulk ops
│   │   ├── items.py          # /api/items - CRUD for articles/products
│   │   ├── number_sets.py    # /api/number-sets - CRUD for invoice number ranges
│   │   └── registry.py       # /api/registry - Bulgarian Trade Registry (BRRA) lookup
│   ├── services/             # Business logic services
│   │   ├── __init__.py
│   │   ├── pdf_generator.py  # PDF generation using WeasyPrint + Jinja2
│   │   └── email_service.py  # Email sending with PDF attachments via SMTP
│   └── templates/
│       └── invoice_pdf.html  # Jinja2 HTML template for PDF invoices
├── tests/
│   └── __init__.py
├── pyproject.toml            # Poetry dependencies and project config
└── poetry.lock
```

### Key Models

| Model | Table | Description |
|-------|-------|-------------|
| `Company` | `companies` | Issuer company data (name, EIK, VAT, address, bank details) |
| `Client` | `clients` | Counterparties/customers with optional individual person mode |
| `Invoice` | `invoices` | All document types (invoice, proforma, debit_note, credit_note) |
| `InvoiceLine` | `invoice_lines` | Line items with qty, price, VAT, discount |
| `Item` | `items` | Product/service catalog with default prices |
| `NumberSet` | `number_sets` | 10-digit invoice numbering ranges (kochani) |

### API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/companies` | GET, POST, PUT | Manage issuer company settings |
| `/api/clients` | GET, POST, PUT, DELETE | CRUD for clients |
| `/api/items` | GET, POST, PUT, DELETE | CRUD for items/articles |
| `/api/invoices` | GET, POST, PUT, DELETE | CRUD for invoices + bulk operations |
| `/api/invoices/{id}/pdf` | GET | Generate and download PDF |
| `/api/invoices/{id}/send-email` | POST | Send invoice PDF via email |
| `/api/invoices/bulk-download` | POST | Bulk download as ZIP |
| `/api/invoices/bulk-email` | POST | Bulk email sending |
| `/api/invoices/bulk-delete` | POST | Bulk delete |
| `/api/invoices/bulk-cancel` | POST | Bulk cancel |
| `/api/number-sets` | GET, POST, PUT, DELETE | Manage numbering ranges |
| `/api/registry/lookup/{eik}` | GET | Lookup company in Bulgarian Trade Registry |

### Trade Registry Integration (`registry.py`)

Scrapes the official Bulgarian Trade Registry (BRRA) at `https://portal.registryagency.bg/CR/Reports/VerificationPersonOrg` to extract:
- Company name
- EIK (Unified Identification Code)
- VAT registration status and number
- MOL (Materially Responsible Person) / Representative
- City (from registered address)
- Full address (street only, without postal code or region)

---

## Frontend (`megabanx-invoicing-frontend/`)

### Tech Stack
- **React 18** with **TypeScript**
- **Vite** build tool
- **Tailwind CSS** for styling
- **shadcn/ui** component library (Radix UI primitives)
- **Axios** for HTTP requests
- **React Router** for navigation
- **lucide-react** for icons
- **@dnd-kit** for drag-and-drop (invoice line reordering)

### Directory Structure

```
megabanx-invoicing-frontend/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Router configuration and routes
│   ├── App.css               # Global CSS overrides
│   ├── index.css             # Tailwind imports and custom utilities
│   ├── vite-env.d.ts         # Vite type declarations
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces (Company, Client, Invoice, etc.)
│   ├── lib/
│   │   ├── api.ts            # Axios instance and all API functions
│   │   ├── company-context.tsx  # React Context for active company state
│   │   └── utils.ts          # Utility functions (cn for class merging)
│   ├── hooks/
│   │   └── use-toast.ts      # Toast notification hook
│   ├── components/
│   │   ├── Layout.tsx        # Main layout with sidebar navigation
│   │   └── ui/               # shadcn/ui components
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── calendar.tsx
│   │       ├── card.tsx
│   │       ├── command.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── popover.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── toast.tsx
│   │       └── toaster.tsx
│   └── pages/
│       ├── Dashboard.tsx     # Home page with stats and quick actions
│       ├── Settings.tsx      # Company settings with Trade Registry lookup
│       ├── Clients.tsx       # Client list with sorting, search, CRUD
│       ├── Items.tsx         # Items list with sorting, search, CRUD
│       ├── InvoicesList.tsx  # Invoice list with tabs, sorting, bulk actions, pagination
│       ├── NewInvoice.tsx    # Invoice creation/editing form (also handles edit mode)
│       └── InvoiceView.tsx   # Invoice preview with inline PDF viewer
├── public/
│   └── vite.svg
├── index.html                # HTML entry point
├── package.json              # NPM dependencies
├── package-lock.json
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── tsconfig.json             # TypeScript base config
├── tsconfig.app.json         # TypeScript app config
├── tsconfig.node.json        # TypeScript Node config
├── eslint.config.js          # ESLint configuration
├── components.json           # shadcn/ui configuration
└── .env.development          # Development environment variables
```

### Pages

| Page | Route | Description |
|------|-------|-------------|
| `Dashboard` | `/` | Overview with document counts and quick action buttons |
| `Settings` | `/settings` | Company data management with Trade Registry auto-fill |
| `Clients` | `/clients` | Client list with column sorting, search, create/edit dialog |
| `Items` | `/items` | Item/article list with column sorting, search, create/edit dialog |
| `InvoicesList` | `/invoices` | Document list with tabs per type, bulk actions, pagination |
| `NewInvoice` | `/invoices/new` | Full invoice form with line items, client selector, discounts |
| `NewInvoice` | `/invoices/:id/edit` | Same form in edit mode |
| `InvoiceView` | `/invoices/:id` | Invoice preview with inline PDF viewer |

### Key Features
- **Column sorting** on all list pages (clickable headers with directional arrows)
- **Alternating row colors** for better readability
- **Trade Registry lookup** in Settings and Client dialogs (Enter key or button)
- **Drag-and-drop** line item reordering in invoice form
- **4 document types**: Invoice, Proforma, Debit Note, Credit Note
- **Number sets (kochani)**: 10-digit invoice numbering with auto-increment
- **Discount**: Per-line or global, in EUR or percentage
- **Physical person mode**: For individual clients without EIK
- **Bulk actions**: Download, print, email, delete, cancel multiple invoices
- **Inline PDF preview**: View generated PDF directly in browser
- **Responsive sidebar** navigation

### API Configuration
- Development: `VITE_API_URL=http://localhost:8006` (in `.env.development`)
- Production: API URL is set at build time in `vite.config.ts`

---

## Deployment

### VPS Configuration
- **Server**: 144.91.122.208
- **Frontend**: Port 8005 (nginx serves static files from `/opt/megabanx-invoicing/frontend/`)
- **Backend**: Port 8006 (uvicorn via systemd service `megabanx-invoicing`)
- **Database**: PostgreSQL database `invoicing` on localhost

### Deployment Steps

1. **Build frontend**:
   ```bash
   cd megabanx-invoicing-frontend
   npm run build
   ```

2. **Deploy frontend** (copy dist to VPS):
   ```bash
   scp -r dist/* root@144.91.122.208:/opt/megabanx-invoicing/frontend/
   ```

3. **Deploy backend** (copy app to VPS):
   ```bash
   scp -r app/* root@144.91.122.208:/opt/megabanx-invoicing/backend/app/
   ```

4. **Restart service**:
   ```bash
   ssh root@144.91.122.208 "systemctl restart megabanx-invoicing"
   ```

### Systemd Service
The backend runs as a systemd service `megabanx-invoicing` that:
- Starts uvicorn on `0.0.0.0:8006`
- Uses the PostgreSQL database
- Auto-restarts on failure

---

## Development

### Backend Setup
```bash
cd megabanx-invoicing-backend
poetry install
poetry run uvicorn app.main:app --reload --port 8006
```

### Frontend Setup
```bash
cd megabanx-invoicing-frontend
npm install
npm run dev
```

### Environment Variables (Backend)
- `DATABASE_URL` - PostgreSQL connection string
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- `FRONTEND_URL` - Frontend URL for CORS

### Currency
All amounts are in **EUR** (Euro) as Bulgaria's primary currency.
