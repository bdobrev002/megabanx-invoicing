# Megabanx 2.0 — Архитектура

## 1. Обща информация

| Параметър | Стойност |
|-----------|----------|
| **Проект** | MegaBanx 2.0 — AI-базирана система за управление на фактури |
| **Текущ URL** | megabanx.com (v1) |
| **Нов URL** | new.megabanx.com (v2, предстои) |
| **GitHub** | github.com/bdobrev002/megabanx-invoicing |
| **Branch** | devin/1776499727-megabanx-v2-skeleton |
| **PR** | #5 |
| **Сървър** | VPS 144.91.122.208 |
| **Backend** | /opt/bginvoices/backend/ (Python/FastAPI) |
| **Frontend v1** | /opt/bginvoices/frontend/ (React monolith) |
| **Frontend v2** | frontend-v2/ (нова модулна архитектура) |
| **Фирма** | Д-РЕНТ ЕООД, ЕИК: 200551856 |

---

## 2. Технологичен стек

### Frontend (v2 — ново)

| Технология | Версия | Роля |
|-----------|--------|------|
| React | 19 | UI framework |
| TypeScript | 6 | Type safety |
| Vite | 8 | Build tool (HMR, ESM) |
| React Router | 7 | URL-based routing |
| Zustand | 5 | Global state management |
| TanStack Query | 5 | Server state / data fetching / caching |
| Tailwind CSS | v4 | Styling |
| Zod | — | Runtime validation |
| Lucide React | — | Иконки |

### Backend v1 (текущ production)

| Технология | Роля |
|-----------|------|
| Python | Backend runtime |
| FastAPI | Web framework + REST API |
| PostgreSQL | Релационна база данни (2 отделни бази) |
| Stripe | Плащания и абонаменти |
| Google Drive API | Съхранение на файлове |
| OpenAI API | AI разпознаване на фактури |
| WebSocket | Real-time известия |
| Nginx | Reverse proxy |

### Backend v2 (нов — в PR #5)

| Технология | Версия | Роля |
|-----------|--------|------|
| Python | 3.11+ | Backend runtime |
| FastAPI | 0.115+ | Web framework + REST API |
| SQLAlchemy | 2.0 | Async ORM (mapped_column синтаксис) |
| asyncpg | — | PostgreSQL async драйвер |
| PostgreSQL | 16 | Единна база `megabanx_v2` (25 таблици) |
| Pydantic | v2 | Request/Response валидация |
| Alembic | — | Database миграции |
| Stripe | — | Плащания и абонаменти |
| Google Gemini | — | AI разпознаване на фактури |
| Google Drive API | — | Съхранение на файлове |
| SMTP (Gmail) | — | Email известия |
| Nginx | — | Reverse proxy |

---

## 3. База данни — PostgreSQL

Backend-ът използва **PostgreSQL** като основна релационна база данни.

### 3.1 Предвидени таблици (~18-20 таблици)

| # | Таблица | Описание | Ключови полета |
|---|---------|----------|----------------|
| 1 | `users` | Потребители (auth) | id, email, name, is_admin, created_at |
| 2 | `profiles` | Потребителски профили (множество на user) | id, user_id, name, created_at |
| 3 | `companies` | Фирми (собствени) | id, profile_id, name, eik, vat_number, address, mol |
| 4 | `company_shares` | Споделяне на фирми с контрагенти | id, company_id, owner_profile_id, shared_with_email, can_upload |
| 5 | `bank_accounts` | Банкови сметки на фирми | id, company_id, iban, bic, bank_name, currency, is_default |
| 6 | `verifications` | Верификация на фирми (3 метода) | id, profile_id, eik, company_name, status, verification_code |
| 7 | `invoices` | Обработени фактури (AI upload) | id, original_filename, new_filename, invoice_type, company_name, date, issuer_name, recipient_name, invoice_number, status |
| 8 | `files` | Файлове (Drive метаданни) | id, name, drive_id, drive_url, company_id, type (purchase/sale) |
| 9 | `notifications` | Известия | id, user_id, type, title, message, timestamp, filename, source |
| 10 | `subscriptions` | Абонаменти (Stripe) | id, user_id, stripe_subscription_id, stripe_customer_id, plan, status, expires |
| 11 | `billing_plans` | Планове за абонамент | id, name, price, currency, interval, max_companies, max_invoices, features |
| 12 | `payments` | Stripe плащания | id, subscription_id, amount_paid, currency, status, invoice_pdf |
| 13 | `auth_codes` | Кодове за верификация (email+code auth) | id, email, code, expires_at |
| 14 | `contacts` | Контактни съобщения | id, name, email, message, created_at |
| 15 | `invoicing_clients` | Клиенти за фактуриране | id, company_id, name, eik, vat_number, address, mol |
| 16 | `invoicing_items` | Артикули за фактуриране | id, company_id, name, unit, price, vat_rate |
| 17 | `invoicing_invoices` | Издадени фактури | id, company_id, doc_type, client_id, stub_id, invoice_number, date, lines, totals, sync_status |
| 18 | `invoicing_stubs` | Кочани (номерация на документи) | id, company_id, name, prefix, start_number, end_number, current_number, doc_type |
| 19 | `invoicing_settings` | Настройки за фактуриране по фирма | id, company_id, vat_settings, defaults |
| 20 | `system_logs` | Системни логове (admin) | id, timestamp, level, message, user_id, action |

### 3.2 Релации

```
users ──1:N──> profiles ──1:N──> companies ──1:N──> bank_accounts
                    │                  │
                    │                  ├──1:N──> invoicing_clients
                    │                  ├──1:N──> invoicing_items
                    │                  ├──1:N──> invoicing_invoices
                    │                  ├──1:N──> invoicing_stubs
                    │                  ├──1:N──> invoicing_settings
                    │                  └──1:N──> files
                    │
                    ├──1:N──> verifications
                    └──1:N──> company_shares

users ──1:N──> notifications
users ──1:1──> subscriptions ──1:N──> payments
```

---

## 4. Текущо състояние (v1 → v2 сравнение)

### 4.1 Проблеми на v1

| # | Проблем | v1 | v2 решение |
|---|---------|-------|-----------|
| 1 | Монолитен файл | App.tsx = 4225 реда | ~160 файла, ~55 реда средно |
| 2 | Без routing | authScreen + activeTab state | React Router v7 с URL-и |
| 3 | Хаотичен state | 50+ useState hooks | Zustand stores + TanStack Query |
| 4 | Без типове | Record<string, unknown>, as any | 16 TypeScript type файла |
| 5 | Без дизайн система | Inline стилове | 10 UI компонента (Button, Modal, Toast, etc.) |
| 6 | DOM manipulation | document.createElement | Чист React JSX |
| 7 | Един API файл | api.ts = 383 реда | 20 API модула |
| 8 | Без lazy loading | Всичко наведнъж | Route-level code splitting |
| 9 | Без error boundaries | Грешка срива всичко | ErrorBoundary компонент |
| 10 | Без admin панел | — | Пълен admin панел (6 секции) |

### 4.2 Какво е направено до момента (Фази 1-3)

| Фаза | Статус | Описание |
|------|--------|----------|
| **Фаза 1 — Скелет** | Готова | Project setup, API layer (20 модула), Zustand stores (13), Types (16), Layout компоненти, Route structure, 80+ page компоненти |
| **Фаза 2 — Дизайн** | Готова | Navbar (dark gradient), Logo (SVG), Sidebar (landing/dashboard), DashboardLayout, Auth pages визия, Landing sections визия, UI компоненти |
| **Фаза 3 — Съдържание + Auth** | Готова | Auth API интеграция (email+code flow), 8 landing секции с реално съдържание от megabanx.com, 13 CSS анимации, Footer |
| **Фаза 4 — Dashboard** | Предстои | Company CRUD, Upload + AI, Files browser, History, Notifications, Billing |
| **Фаза 5 — Фактуриране** | Предстои | Invoice form (5 doc types), Clients, Items, Stubs, Settings, Sync, PDF |
| **Фаза 6 — Admin панел** | Предстои | Users, Companies, Verifications, Billing, Logs, Settings |
| **Backend v2 — Скелет** | ✅ Готов (PR #5) | 25 модела, 10 рутера, 6 сервиса, 46 бъга поправени |

---

## 5. Файлова структура на Frontend v2

```
frontend-v2/src/
├── main.tsx                          — Entry point
├── App.tsx                           — Router setup + providers + AuthInitializer
├── index.css                         — Tailwind + custom CSS анимации
│
├── api/                              — API layer (20 модула + WebSocket)
│   ├── client.ts                     — Base fetch wrapper (apiFetch, uploadFetch)
│   ├── auth.api.ts                   — Auth endpoints (login, register, verify, me, logout)
│   ├── profiles.api.ts               — Profile CRUD
│   ├── companies.api.ts              — Company CRUD + EIK lookup
│   ├── files.api.ts                  — Upload, process, download, delete
│   ├── invoices.api.ts               — Invoice history endpoints
│   ├── notifications.api.ts          — Notification endpoints
│   ├── billing.api.ts                — Billing/subscription/Stripe endpoints
│   ├── sharing.api.ts                — Company sharing endpoints
│   ├── verification.api.ts           — Verification (bank, QR, ID card)
│   ├── invoicing.api.ts              — Invoicing module (clients, items, stubs, invoices)
│   ├── contact.api.ts                — Contact form
│   ├── admin.api.ts                  — Admin panel endpoints
│   ├── trLookup.api.ts               — Търговски регистър API
│   ├── pairing.api.ts                — Invoice pairing/mirroring
│   ├── lifecycle.api.ts              — Document lifecycle rules
│   ├── bankAccounts.api.ts           — Bank accounts CRUD
│   ├── stubs.api.ts                  — Stubs/numbering CRUD
│   ├── approval.api.ts               — Approve/reject pending invoices
│   ├── periodic.api.ts               — Periodic invoices CRUD
│   └── websocket.ts                  — WebSocket connection manager
│
├── stores/                           — Zustand stores (13)
│   ├── authStore.ts                  — currentUser, auth flow state, fetchUser, logout
│   ├── profileStore.ts               — activeProfile, profiles
│   ├── companyStore.ts               — companies, expandedCompanies
│   ├── fileStore.ts                  — folderStructure, selectedFiles
│   ├── invoiceStore.ts               — invoices (history), filters
│   ├── notificationStore.ts          — notifications
│   ├── billingStore.ts               — subscription, plans, payments
│   ├── uiStore.ts                    — error, success, loading
│   ├── invoicingStore.ts             — invoicing module state
│   ├── adminStore.ts                 — admin panel state
│   ├── pairingStore.ts               — invoice pairing state
│   ├── lifecycleStore.ts             — document lifecycle rules
│   └── verificationStore.ts          — verification flow state
│
├── types/                            — TypeScript типове (16 файла)
│   ├── auth.types.ts                 — AuthUser, SubscriptionInfo
│   ├── company.types.ts              — Company, CompanyShare, SharedCompanyInfo
│   ├── file.types.ts                 — FileInfo, FolderItem, InvoiceRecord
│   ├── invoice.types.ts              — InvoiceHistoryItem, InvoiceFilter
│   ├── billing.types.ts              — BillingPlan, StripePayment
│   ├── notification.types.ts         — Notification
│   ├── sharing.types.ts              — ShareInvite, ShareResponse
│   ├── invoicing.types.ts            — InvoiceClient, InvoiceItem, InvoiceLine, InvoiceStub, InvoiceFormData
│   ├── admin.types.ts                — AdminUser, AdminStats, SystemLog
│   ├── pairing.types.ts              — PairingRule, PairingResult
│   ├── lifecycle.types.ts            — LifecycleRule
│   ├── bankAccount.types.ts          — BankAccount
│   ├── stub.types.ts                 — Stub
│   ├── verification.types.ts         — PendingVerification, VerificationMethod
│   ├── profile.types.ts              — Profile
│   └── approval.types.ts             — ApprovalAction, ApprovalResult
│
├── components/                       — Споделени компоненти
│   ├── ui/                           — Дизайн система (10 компонента)
│   │   ├── Button.tsx                — Primary, secondary, danger, ghost, loading
│   │   ├── Input.tsx                 — Text input с label, error
│   │   ├── Select.tsx                — Dropdown select
│   │   ├── Modal.tsx                 — Popup прозорец (sm/md/lg/xl)
│   │   ├── Card.tsx                  — Content card wrapper
│   │   ├── Toast.tsx                 — Success/error notification, auto-dismiss
│   │   ├── Spinner.tsx               — Loading spinner
│   │   ├── Badge.tsx                 — Status badge
│   │   ├── Table.tsx                 — Sortable table
│   │   └── IconButton.tsx            — Icon-only button
│   │
│   ├── layout/                       — Layout компоненти
│   │   ├── Navbar.tsx                — Dark blue gradient navbar
│   │   ├── Sidebar.tsx               — Left sidebar (landing/dashboard variants)
│   │   ├── DashboardLayout.tsx       — Stats bar + tab navigation + content
│   │   ├── LandingLayout.tsx         — Navbar + sidebar + landing content
│   │   └── AdminLayout.tsx           — Admin sidebar + content
│   │
│   ├── ProtectedRoute.tsx            — Auth guard (redirect to /login)
│   └── AdminRoute.tsx                — Admin guard (is_admin check)
│
├── pages/                            — Page компоненти
│   ├── landing/                      — 8 landing секции
│   │   ├── LandingPage.tsx           — Container (renders only HeroSection at /)
│   │   ├── HeroSection.tsx           — Hero + AI info box + 10 feature cards
│   │   ├── HowItWorksSection.tsx     — ~600 реда: мотивация, сравнения, анимирана сцена, 3 стъпки, ползи
│   │   ├── ScreenshotsSection.tsx    — Screenshot gallery (placeholder)
│   │   ├── SecuritySection.tsx       — Верификация + криптиране
│   │   ├── PricingSection.tsx        — Цветни план карти от API + fallback
│   │   ├── FaqSection.tsx            — 13 FAQ accordion елемента
│   │   ├── AboutUsSection.tsx        — История + фирмени данни
│   │   └── ContactSection.tsx        — Контактна форма + API
│   │
│   ├── auth/                         — Auth екрани (API интеграция)
│   │   ├── LoginPage.tsx             — Email → verify redirect
│   │   ├── RegisterPage.tsx          — Name + Email + ToS → verify redirect
│   │   └── VerifyPage.tsx            — 6-digit code, auto-submit, auto-focus
│   │
│   ├── dashboard/                    — Dashboard (placeholder за Фаза 4)
│   │   ├── CompaniesPage.tsx
│   │   ├── UploadPage.tsx
│   │   ├── FilesPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   └── BillingPage.tsx
│   │
│   ├── invoicing/                    — Фактуриране (placeholder за Фаза 5)
│   │   └── InvoicingPage.tsx
│   │
│   └── admin/                        — Admin панел (placeholder за Фаза 6)
│       ├── AdminDashboardPage.tsx
│       ├── AdminUsersPage.tsx
│       ├── AdminCompaniesPage.tsx
│       ├── AdminVerificationsPage.tsx
│       ├── AdminBillingPage.tsx
│       ├── AdminLogsPage.tsx
│       └── AdminSettingsPage.tsx
│
└── utils/                            — Utility функции
    ├── constants.ts                  — API_BASE_URL, APP_NAME, ROUTES
    ├── formatters.ts                 — Number/date/currency formatting
    └── validators.ts                 — EIK (9 и 13-цифрен), IBAN валидация
```

**Текущо**: 160 файла, ~159 TypeScript/TSX

---

## 6. Backend API структура

### 6.1 Backend v1 API (текущ — порт 8004)

Backend v1 предоставя ~72 endpoint функции, организирани в 18 групи:

| # | Група | Endpoints | Описание |
|---|-------|-----------|----------|
| 1 | Auth | 5 | register, login, verify, me, logout |
| 2 | Profiles | 4 | CRUD |
| 3 | Companies | 4 | CRUD (profile-scoped) |
| 4 | EIK Lookup | 1 | Търговски регистър |
| 5 | Upload & Process | 3 | upload, process, process-stream (SSE) |
| 6 | Inbox | 2 | get, clear |
| 7 | Folder Structure | 1 | get (companies → purchases/sales) |
| 8 | Invoices | 2 | get, clear |
| 9 | Notifications | 3 | get, delete, deleteAll |
| 10 | File Operations | 7 | download, preview, viewer, delete, batch download/delete |
| 11 | Approval | 2 | approve, resolve duplicate |
| 12 | Billing | 8 | plans, subscription, checkout, trial, cancel, reactivate, portal, payments |
| 13 | Contact | 2 | submit, settings |
| 14 | Verification | 4 | bank details, pending, delete, ID card verify |
| 15 | Company Sharing | 8 | share, shares, update, revoke, shared companies/folders/download |
| 16 | QR Verification | 3 | create session, status, QR image |
| 17 | WebSocket | 1 | ws?token=... (real-time notifications) |
| 18 | Invoicing Module | 18 | clients CRUD, items CRUD, invoices CRUD, stubs CRUD, settings, sync, email |

**Общо v1: ~72 endpoint функции**

### 6.2 Backend v2 API (нов — в разработка)

**Архитектура**: Async-first, единна PostgreSQL база `megabanx_v2` (25 таблици), SQLAlchemy 2.0 ORM.

**Файлова структура**:
```
backend-v2/app/
├── main.py              — FastAPI app, CORS, lifespan, router включване
├── config.py            — Pydantic Settings (DATABASE_URL, SMTP, Stripe, Gemini keys)
├── database.py          — AsyncSession factory, create_all_tables
├── dependencies.py      — get_current_user (session token + expiry проверка)
├── models/              — 25 SQLAlchemy ORM модела
│   ├── base.py          — DeclarativeBase
│   ├── user.py          — User, Session, AuthCode
│   ├── profile.py       — Profile
│   ├── company.py       — Company, BankAccount, Verification
│   ├── invoice.py       — Invoice, InvoiceMonthlyUsage
│   ├── drive.py         — DriveFile
│   ├── notification.py  — Notification
│   ├── billing.py       — Billing, BillingPlan, Payment
│   ├── sharing.py       — CompanyShare
│   ├── invoicing.py     — InvClient, InvItem, InvStub, InvSettings, IssuedInvoice
│   ├── contact.py       — ContactMessage
│   ├── email_link.py    — EmailLoginLink
│   └── admin.py         — SystemLog
├── schemas/             — Pydantic v2 request/response модели
│   ├── invoice.py       — UploadInvoice, InvoiceOut, InboxItem, FolderStructure
│   ├── invoicing.py     — Client/Item/Stub/Settings/IssuedInvoice schemas
│   └── contact.py       — ContactCreate
├── routers/             — 10 FastAPI рутера
│   ├── auth.py          — POST register, login, verify, GET me, POST logout
│   ├── profiles.py      — CRUD profiles (delete блокирано — 400)
│   ├── companies.py     — CRUD companies + bank accounts + verification
│   ├── invoices.py      — Upload (AI), list, download, delete + usage limits
│   ├── invoicing.py     — Clients, Items, Stubs, Settings, Issued invoices CRUD
│   ├── notifications.py — List, read, delete notifications
│   ├── billing.py       — Plans, subscribe, checkout, cancel + Stripe webhooks
│   ├── sharing.py       — Share, update, revoke, list shares
│   ├── contact.py       — Submit contact form
│   └── admin.py         — Users, companies, verifications, logs, settings
├── services/            — Бизнес логика
│   ├── auth_service.py  — OTP генерация, верификация, сесии
│   ├── email_service.py — SMTP email (HTML escaped templates)
│   └── file_manager.py  — Filesystem операции (sanitized paths)
└── utils/
    └── __init__.py      — sanitize_path_component(), helpers
```

**Ключови разлики v1 → v2**:

| Аспект | v1 | v2 |
|--------|----|----|  
| База данни | 2 отделни (bginvoices + invoicing) | 1 единна `megabanx_v2` (25 таблици) |
| ORM | Сурови SQL заявки | SQLAlchemy 2.0 async ORM |
| Валидация | Ръчна | Pydantic v2 schemas |
| AI Engine | OpenAI GPT | Google Gemini |
| Конкурентност | Sync | Async/await (asyncpg) |
| Числа | Float | Decimal/Numeric (financial precision) |
| Auth | JWT tokens | Session tokens (30-day expiry) |
| Security | Базова | XSS prevention, path traversal protection, row-level locking |

**Сигурност (46 бъга поправени в 9 рунда Devin Review)**:
- Path traversal защита (sanitize_path_component)
- XSS prevention (HTML escape в email templates)
- Race condition prevention (INSERT ON CONFLICT upsert)
- Ownership verification на всички multi-tenant операции
- Expired session cleanup с commit safety
- AI null coalescing за Gemini JSON responses
- Stub number range overflow protection

---

## 7. Routing план

```
Публични:
/                          → HeroSection (landing page)
/how                       → HowItWorksSection
/screenshots               → ScreenshotsSection
/security                  → SecuritySection
/pricing                   → PricingSection
/faq                       → FaqSection
/about-us                  → AboutUsSection
/contact                   → ContactSection
/terms                     → TermsPage (Общи условия)
/privacy                   → PrivacyPage (Поверителност)
/cookies                   → CookiePolicyPage (Бисквитки)

Auth:
/login                     → LoginPage
/register                  → RegisterPage
/verify                    → VerifyPage

Dashboard (protected):
/dashboard                 → redirect to /dashboard/companies
/dashboard/companies       → CompaniesPage
/dashboard/upload          → UploadPage
/dashboard/files           → FilesPage
/dashboard/history         → HistoryPage
/dashboard/notifications   → NotificationsPage
/dashboard/billing         → BillingPage
/dashboard/invoicing       → InvoicingPage

Admin (admin-only):
/admin                     → AdminDashboardPage
/admin/users               → AdminUsersPage
/admin/companies           → AdminCompaniesPage
/admin/verifications       → AdminVerificationsPage
/admin/billing             → AdminBillingPage
/admin/logs                → AdminLogsPage
/admin/settings            → AdminSettingsPage
```

---

## 8. State Management

```
┌─────────────────────────────────────────────────┐
│                  Zustand Stores                  │
│                                                  │
│  authStore      → currentUser, isAuthenticated   │
│  profileStore   → activeProfile, profiles[]      │
│  uiStore        → error, success, loading        │
│  invoicingStore → form state, modal state        │
│  + 9 други stores за domain state                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              TanStack Query (Фаза 4+)            │
│                                                  │
│  useCompaniesQuery(profileId)                    │
│  useFolderStructureQuery(profileId)              │
│  useInvoicesQuery(profileId)                     │
│  useNotificationsQuery(profileId)                │
│  useBillingQuery()                               │
│  useSharedCompaniesQuery()                       │
│  useClientsQuery(companyId, profileId)           │
│  useItemsQuery(companyId, profileId)             │
│  useStubsQuery(companyId, profileId)             │
└─────────────────────────────────────────────────┘
```

**Zustand** — UI state (auth, active tab, modals)
**TanStack Query** — Server data (companies, invoices, notifications) с cache, refetch, invalidation

---

## 9. Deployment стратегия

```
┌──────────────────────────────────────────────┐
│                ТЕКУЩО (v1)                    │
│                                              │
│   megabanx.com  →  VPS 144.91.122.208       │
│   /opt/bginvoices/backend/ (порт 8004)       │
│   /opt/bginvoices/frontend/ (React build)     │
│   Nginx reverse proxy + SSL (Certbot)        │
│   PostgreSQL database                        │
│   GitHub: bdobrev002/megabanx-invoicing      │
│   Branch: main                               │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│              V2 PREVIEW                      │
│                                              │
│   new.megabanx.com → /opt/megabanx-v2/       │
│   megabanx.duckdns.org → /opt/megabanx-v2/   │
│   frontend-dist/ (React v2 build)            │
│   source/ (пълен source код)                 │
│   Backend v2: backend-v2/ (не е пуснат още)  │
│   Branch: devin/1776499727-megabanx-v2-skel  │
│   PR: #5                                     │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│              MEGABANX 2.0 ПЛАН               │
│                                              │
│   Стъпка 1: Preview на megabanx.duckdns.org │
│   - Frontend v2 + Backend v2 source код      │
│   - Тестване и review                        │
│                                              │
│   Стъпка 2: Backend v2 deploy               │
│   - PostgreSQL миграция (alembic)            │
│   - Backend v2 на порт 8007                  │
│   - Nginx proxy за API                       │
│                                              │
│   Стъпка 3: Превключване                     │
│   - new.megabanx.com → megabanx.com          │
│   - Стария сайт → old.megabanx.com           │
│   - DNS switch                               │
└──────────────────────────────────────────────┘
```

---

## 10. Типове документи

| # | Тип | Код | Описание |
|---|-----|-----|----------|
| 1 | Фактура | `invoice` | Стандартна фактура |
| 2 | Проформа фактура (изходяща) | `proforma` | Проформа към клиент |
| 3 | Проформа фактура (входяща) | `proforma_received` | Получена проформа (НОВО в 2.0) |
| 4 | Дебитно известие | `debit_note` | Увеличение на данъчна основа |
| 5 | Кредитно известие | `credit_note` | Намаление на данъчна основа |
| 6 | Периодична фактура | `periodic` | Автоматично генериране по график (НОВО в 2.0) |

---

## 11. Защити и сигурност

| Ниво | Защита | Кога действа |
|------|--------|-------------|
| 1 | ESLint правила | Забранява DOM manipulation в source |
| 2 | Build validation | Проверява dist/ за чистота |
| 3 | RULES.md | Инструкции за AI агенти |
| 4 | Pre-commit Hook | Блокира commit на dist/ файлове |
| 5 | CI/CD Pipeline | Автоматичен build + deploy |
| 6 | Runtime Check | Детектира инжектирани скриптове |

---

## 12. Auth Flow

```
Email+Code (без пароли):
1. Потребител въвежда email
2. Backend изпраща 6-цифрен код на email
3. Потребител въвежда кода
4. Backend връща JWT token
5. Token се записва в localStorage
6. AuthInitializer извиква /auth/me при refresh
```

---

## 13. Бъдещи фази

### Фаза 4 — Dashboard функционалност
- Company CRUD + EIK Lookup + Verification (3 метода)
- Upload + AI Processing (SSE streaming)
- File Browser (multi-select, keyboard nav)
- History + Notifications
- Billing (Stripe checkout, trial, cancel)

### Фаза 5 — Фактуриране модул
- Invoice form (5 doc types)
- Clients / Items / Stubs CRUD
- PDF preview + templates
- Sync + Email
- Periodic invoices

### Фаза 6 — Admin панел
- Users management (search, ban, impersonate)
- Companies overview + Verification review
- Billing overview + System logs
- Admin settings

---

## 14. Build & Deploy

```bash
# Локална разработка
cd frontend-v2
npm install
npm run dev          # http://localhost:5173

# Production build
npm run build        # tsc -b && vite build → dist/

# Deploy
# Вариант 1: Devin deploy
deploy_frontend dir="frontend-v2/dist"

# Вариант 2: На VPS (new.megabanx.com)
scp -r dist/* server:/opt/bginvoices/frontend-v2/
# + Nginx vhost config за new.megabanx.com
```

---

*Документ генериран на 18.04.2026 г., обновен на 19.04.2026 г. — добавена Backend v2 архитектура*
