# Megabanx 2.0 — Архитектура

## 1. Обща информация

| Параметър | Стойност |
|-----------|----------|
| **Проект** | MegaBanx 2.0 — AI-базирана система за управление на фактури |
| **Текущ URL (v1)** | megabanx.com |
| **Production URL (v2)** | megabanx.duckdns.org |
| **GitHub** | github.com/bdobrev002/megabanx-invoicing |
| **Branch** | main |
| **Последен merged PR** | #12 (Stage 1.2 Invoice Form) |
| **Отворен PR** | #14 (API_BASE_URL fix) |
| **Сървър** | VPS 144.91.122.208 |
| **Backend v1** | /opt/bginvoices/backend/ (Python/FastAPI, порт 8004) |
| **Backend v2** | /opt/megabanx-v2/source/backend-v2/ (FastAPI, порт 8007) |
| **Frontend v1** | /opt/bginvoices/frontend/ (React monolith) |
| **Frontend v2 source** | /opt/megabanx-v2/source/frontend-v2/ |
| **Frontend v2 dist** | /opt/megabanx-v2/frontend-dist/ (production build) |
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

### 4.2 Какво е направено до момента

| Фаза / Stage | Статус | PR | Описание |
|------|--------|-----|----------|
| **Фаза 1 — Скелет** | ✅ Merged | #5 | Project setup, API layer (20 модула), Zustand stores (13), Types (16), Layout компоненти, Route structure, 80+ page компоненти |
| **Фаза 2 — Дизайн** | ✅ Merged | #5 | Navbar (dark gradient), Logo (SVG), Sidebar (landing/dashboard), DashboardLayout, Auth pages визия, Landing sections визия, UI компоненти |
| **Фаза 3 — Съдържание + Auth** | ✅ Merged | #5 | Auth API интеграция (email+code flow), 8 landing секции с реално съдържание от megabanx.com, 13 CSS анимации, Footer |
| **Фаза 4 — Dashboard** | ✅ Merged | #6 | Company CRUD, Files browser, History, UploadPage, компоненти за всички dashboard табове (42 компонента) |
| **Правни страници** | ✅ Merged | #7 | Privacy, Terms, Cookies pages + unified popup module + ESLint |
| **Фаза 5 — WebSocket + Invoicing skeleton** | ✅ Merged | #8 | Real-time WebSocket delivery ticks, InvoicingModule skeleton (клиенти, артикули, кочани, настройки, фактури), session expiry 180 дни |
| **Stage 0 — Foundation & Protections** | ✅ Merged | #10 | RULES.md, ESLint забрани, husky pre-commit, validate-build.sh, GitHub Actions CI, Alembic baseline, `create_all` махнат, Devin Review deferred fixes |
| **Stage 1.1 — Invoicing backend + PDF** | ✅ Merged | #11 | 5 нови endpoint-а (`next-number`, `registry/lookup`, `check-counterparty`, `client-emails`, `editable`), WeasyPrint + Jinja2 PDF рендер (invoice + proforma), `sanitize_path_component` helper, explicit `await db.commit()` преди BackgroundTasks |
| **Stage 1.2 — Invoicing frontend form** | ✅ Merged | #12 | Пълна invoice форма — 8-те stub компонента попълнени: `InvoiceForm`, `ClientSection`, `DocTypeSelector`, `InvoiceDetails`, `LineItemsTable`, `TotalsSection`, `NotesSection`, `FormActions`. Автоматична номерация, каталог на артикули, VAT reasons, currency display, edit на чернови |
| **API_BASE_URL hotfix** | 🟡 Open | #14 | Frontend сочеше към `megabanx.com/api` (v1); смяна към `window.location.origin + '/api'` за да работи v2 на `megabanx.duckdns.org`. Defensive `?? []` на `folder.subfolders` |
| **Stage 2 — Cross-copy write-path** | Предстои | — | Автоматично огледално създаване на фактура в профила на контрагента по ЕИК, WS нотификация, `check-counterparty` UI бутон |
| **Фаза 6 — Admin панел** | Предстои | — | Users, Companies, Verifications, Billing, Logs, Settings |

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
│   ├── companies/                    — Фирми (Фаза 4, пълна функционалност)
│   │   ├── CompaniesPage.tsx         — Списък фирми в профил + heading + бутон
│   │   ├── CompanyCard.tsx           — Карта фирма (ЕИК, ДДС, адрес, управители, съдружници)
│   │   ├── OwnCompanyForm.tsx        — Форма за създаване/редактиране на фирма
│   │   ├── SharedCompanies.tsx       — Споделени фирми
│   │   └── ShareDialog.tsx           — Диалог за споделяне
│   │
│   ├── upload/                       — Качване (Фаза 4)
│   │   └── UploadPage.tsx
│   │
│   ├── files/                        — Файлове (Фаза 4)
│   │   └── FilesPage.tsx
│   │
│   ├── history/                      — История (Фаза 4)
│   │   ├── HistoryPage.tsx
│   │   └── HistoryTable.tsx
│   │
│   ├── notifications/                — Известия (Фаза 4)
│   │   └── NotificationsPage.tsx
│   │
│   ├── billing/                      — Абонамент (Фаза 4)
│   │   └── BillingPage.tsx
│   │
│   ├── invoicing/                    — Фактуриране (Фаза 5, пълен модул)
│   │   └── InvoicingModule.tsx       — Клиенти, артикули, кочани, настройки, фактури CRUD
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
| Auth | JWT tokens | Session tokens (180-day expiry) |
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
│              V2 PRODUCTION (актуално)        │
│                                              │
│   megabanx.duckdns.org → /opt/megabanx-v2/   │
│   frontend-dist/ (React v2 build)            │
│   source/backend-v2/ (git clone, main)       │
│   source/backend-v2/.venv (uv + weasyprint)  │
│   Backend v2: порт 8007 (systemd service:    │
│     megabanx-v2-backend.service)             │
│   DB: megabanx_v2 (PostgreSQL, Alembic mgmt) │
│   Nginx reverse proxy + SSL (Certbot)        │
│   Branch: main @ последен merged PR          │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│              CUTOVER ПЛАН (Stage 11)         │
│                                              │
│   Стъпка 1: ✅ Preview на duckdns.org        │
│   Стъпка 2: ✅ Backend v2 deploy + Alembic  │
│   Стъпка 3: Data migration (v1 → v2)         │
│     - ENCRYPTION_KEY от v1 запазен в         │
│       /home/ubuntu/.megabanx-v2-stage11/     │
│     - SQL + file sync през Alembic миграции  │
│   Стъпка 4: DNS switch                       │
│     - megabanx.com → v2                      │
│     - old.megabanx.com → v1 archive          │
└──────────────────────────────────────────────┘
```

### 9.1 Deploy процедура (v2, ръчна)

```bash
# 1. Source sync (main branch)
ssh root@144.91.122.208 "cd /opt/megabanx-v2/source && git fetch && git reset --hard origin/main"

# 2. Backend — нови deps (ако има промяна в pyproject.toml)
ssh root@144.91.122.208 "cd /opt/megabanx-v2/source/backend-v2 && .venv/bin/pip install -U weasyprint jinja2"
# system libs за WeasyPrint (еднократно):
#   apt-get install libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libcairo2 \
#                   libgdk-pixbuf-2.0-0 libffi-dev shared-mime-info fonts-dejavu-core

# 3. Alembic upgrade
ssh root@144.91.122.208 "cd /opt/megabanx-v2/source/backend-v2 && .venv/bin/alembic upgrade head"

# 4. Frontend — build локално и rsync
cd frontend-v2 && npm run build
rsync -az --delete dist/ root@144.91.122.208:/opt/megabanx-v2/frontend-dist/

# 5. Restart backend
ssh root@144.91.122.208 "systemctl restart megabanx-v2-backend.service"

# 6. Smoke test
curl -s https://megabanx.duckdns.org/health   # → {"status":"ok"}
```

**Критично**: `.env` файлът на `/opt/megabanx-v2/source/backend-v2/.env` трябва да се запазва при deploy — съдържа реалните DB credentials. Ако се презапише с `.env.example`, backend-ът ще падне с `InvalidPasswordError`. Бъдещ `deploy-v2.sh` ще изключи `.env`, `data/`, други local-only файлове.

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

### Фаза 4 — Dashboard функционалност ✅ ГОТОВА
- Company CRUD (CompaniesPage, CompanyCard, OwnCompanyForm, ShareDialog)
- Files browser (FilesPage)
- History (HistoryPage, HistoryTable)
- Upload (UploadPage)
- Notifications + Billing pages
- 42 компонента общо

### Фаза 5 — WebSocket + Фактуриране ✅ ГОТОВА
- Real-time WebSocket delivery tracking (delivery ticks)
- InvoicingModule — Клиенти, Артикули, Кочани, Настройки, Фактури CRUD
- Session expiry увеличен на 180 дни
- Backend invoicing router + schemas + models

### Фаза 5.5 — Layout 1:1 copy ✅ ГОТОВА
- CSS класове копирани директно от megabanx.com с Playwright
- Stats bar, tabs, company cards, heading, бутони — всичко 1:1
- XSS fix: address rendering с React елементи вместо dangerouslySetInnerHTML

### Фаза 6 — Admin панел (ПРЕДСТОИ)
- Users management (search, ban, impersonate)
- Companies overview + Verification review
- Billing overview + System logs
- Admin settings

---

## 13.1 Stage 0 — Foundation & Protections (PR #10) ✅ MERGED

Преди Stage 1 функционалност, въведена е защитна рамка срещу повтаряне на v1 проблемите.

### Забрани, кодирани в инструментите

| Защита | Файл | Какво блокира |
|--------|------|---------------|
| RULES.md | `.agents/RULES.md` | AI-инструкции: без `patch_*.py`, без DOM manipulation, без inline скриптове, без `eval`, без директна манипулация на `dist/` |
| ESLint | `frontend-v2/eslint.config.js` | `no-restricted-syntax` за DOM APIs, `no-eval`, `no-new-func` |
| Pre-commit (husky) | `.husky/pre-commit` + `.lintstagedrc.json` | `eslint --fix` + блок за `frontend-v2/dist/**` в staged файлове |
| validate-build.sh | `scripts/validate-build.sh` | Търси забранени patterns в `dist/` след build |
| GitHub Actions CI | `.github/workflows/ci.yml` | Frontend: lint + typecheck + build + validate. Backend: ruff. Всички PR-и към main. |

### Alembic (schema versioning)

- `backend-v2/alembic.ini`, `backend-v2/alembic/env.py` (async engine)
- Baseline миграция `41b033cfed1b` покрива всичките 25 таблици
- `Base.metadata.create_all()` **махнат от `main.py`** — schema вече се версионира в Git, не се създава при старт
- Производствена БД `megabanx_v2` drop-нах + recreate-нах + `alembic upgrade head` → чисто начало
- Всяка следваща schema промяна = нов файл в `alembic/versions/` (правило: без ръчни `ALTER` в production)

### Deferred fixes (от Devin Review на PR #8)

- `useWsRefresh` hook — debounce на WebSocket-тригерирани рефреш-и
- `Toast` — използва `ref` вместо stale closure
- `VerifyPage` — setState guard при unmount
- `main.tsx` — guard при липсваща `#root`
- Ruff cleanup

---

## 13.2 Stage 1.1 — Invoicing Backend + PDF (PR #11) ✅ MERGED

### Нови endpoint-и (`/api/invoicing`)

| Метод | Path | Описание |
|-------|------|----------|
| GET | `/next-number?company_id=...&stub_id=...` | Следващ свободен номер от кочана |
| GET | `/registry/lookup/{eik}` | Lookup в Търговски регистър по ЕИК |
| GET | `/check-counterparty/{eik}` | Проверка дали ЕИК-ът съществува като наша фирма (за cross-copy) |
| GET | `/client-emails/{client_id}` | Email адреси на клиент (за изпращане) |
| GET | `/invoices/{id}/editable` | Проверка дали фактура е editable (draft) |

### PDF генериране

- `app/services/pdf_service.py` с WeasyPrint + Jinja2
- Шаблони: `templates/invoice_pdf.html`, `templates/proforma_pdf.html` (копирани от v1)
- Hook в `POST/PUT/DELETE /invoices` през FastAPI `BackgroundTasks`
- **Критичен bug fix**: BackgroundTasks се fire-ват ПРЕДИ yield-dependency cleanup-а (т.е. преди `get_db` да commit-не). Затова background task-ът отваряше нова сесия и не виждаше новия ред (POST) / deadlock-ваше (PUT). Fix: explicit `await db.commit()` **преди** `background_tasks.add_task(...)`.

### Други

- `sanitize_path_component` shared helper — `_sanitize_for_path` не хващаше `..`
- Shared `async_session_factory` вместо отделен `AsyncEngine` на всеки render
- Нови depend-и: `weasyprint`, `jinja2`
- System libs: `libpango-1.0-0`, `libpangoft2-1.0-0`, `libharfbuzz0b`, `libcairo2`, `libgdk-pixbuf-2.0-0`, `libffi-dev`, `shared-mime-info`, `fonts-dejavu-core`

---

## 13.3 Stage 1.2 — Invoicing Frontend Form (PR #12) ✅ MERGED

Попълнени са 8-те stub компонента от Фаза 5 с реална функционалност (без да се пипа архитектурата):

| Компонент | Роля |
|-----------|------|
| `InvoiceForm.tsx` | Orchestrator: зарежда/записва черновата, валидации, статус flow, preload на settings/clients/items |
| `ClientSection.tsx` | Client picker (autocomplete + create inline), EIK lookup, registry sync |
| `DocTypeSelector.tsx` | Доктип (фактура, проформа, дебитно/кредитно известие) |
| `InvoiceDetails.tsx` | Номер (от `/next-number`), дата, кочан, валута, метод на плащане |
| `LineItemsTable.tsx` | Редове: артикул picker, qty, unit, price, discount, VAT rate |
| `TotalsSection.tsx` | Subtotal / VAT / total + VAT reasons panel (Part 5.15) |
| `NotesSection.tsx` | Бележки + метод на плащане |
| `FormActions.tsx` | Save draft / Issue / Cancel + edit-is-draft правило |

### Part 5.15–5.18

- **VAT reasons** (причина при 0% ДДС): обосновка по ЗДДС, custom text опция
- **Currency display** (BGN / EUR / USD с форматиране)
- **Price mode toggle** (без ДДС / с ДДС)
- **Unit selector** (бр, м, кг, час, литър, …)
- **Discount** (% + fixed)

### Devin Review findings (3 итерации)

| # | Fix |
|---|-----|
| 1 | `pickItem` — 0% ДДС от каталога се прилага (`!= null` вместо `||`) |
| 2 | `updateInvoice` — `status` параметър, чернова остава чернова при edit |
| 3 | Sync settings — preload през `getSyncSettings`, save през `updateSyncSettings` |
| 4 | Status ternary tautology → `status === 'draft' ? 'draft' : currentStatus` (допуска само demotion) |
| 5 | API call извън `setData` updater (StrictMode duplicate requests) |
| 6 | `no_vat_reason === 'other'` + празен custom text: resolve ПРЕДИ валидацията |

---

## 13.5 Stage 2 — Cross-copy write-path (PR #15) ✅MERGED

Огледално копиране на издадена фактура към контрагент, когато ЕИК на получателя съвпада с регистрирана фирма в ДРУГ профил.

### Backend
- При `POST /api/invoicing/invoices` и `PUT /api/invoicing/invoices/{id}`:
  - Ако `client.eik == companies.eik` в различен `profile_id` → създава се `Notification` + `InvInvoiceMeta.cross_copy_status = "pending"` + WS broadcast към собственика на контрагента.
  - Guard срещу дублирани notification-и при повторна редакция на pending запис (`_schedule_cross_copy` skip-ва notify-а ако `cross_copy_status == "pending"`).
- Нови endpoint-и:
  - `GET /api/invoicing/incoming` — листва pending cross-copies (с `profile_id != requester_profile_id` филтър, оptional `company_id` филтър).
  - `POST /api/invoicing/incoming/{id}/approve` — `cross_copy_status = "approved"`.
  - `POST /api/invoicing/incoming/{id}/reject` — `cross_copy_status = "rejected_by_recipient"`.
  - `_assert_recipient_of(meta, user)` гарантира, че само получателят може да одобрява/отхвърля (403 при опит от издателя).

### Frontend
- Зелен badge „✓ Регистриран контрагент в MegaBanx" в `ClientSection` при match.
- Нов таб **Входящи** във Фактуриране с count badge, Approve/Reject действия, WS auto-refresh.

### Devin Review фиксове (`28d5538`)
1. `GET /incoming` връщаше и собствените записи → добавен filter.
2. Издателят можеше да approve-не собствения запис → 403.
3. Дублиращи Notification-и при редакция → skip при вече pending.

---

## 13.6 Stage 3 — AI Upload & auto-classify (PR #16) ✅MERGED

### Backend
- Auto-класификация в `/api/files/upload` и `/api/files/upload-multiple`:
  - `issuer_eik ∈ companies.eik(profile)` → `invoice_type = "sale"`.
  - `recipient_eik ∈ companies.eik(profile)` → `invoice_type = "purchase"`.
  - Ако и двата match-ват → приоритет **issuer (sale)** за детерминизъм.
- Duplicate guard: `(issuer_eik, invoice_number)` unique в рамките на profile — връща 409 с flag, без да консумира месечен invoice quota (quota нараства САМО при създаване на нов запис, не при dup hit).
- `POST /api/invoices/{id}/reclassify` — ръчно класифициране на несъответстващи фактури (от Входяща кутия).
- Upload формати: PDF + JPG/PNG/GIF/BMP/WEBP/TIFF.
- Gemini 2.5 Flash за OCR + data extraction.

### Frontend
- DropZone приема всички горни формати.
- Жълт банер „Вече има такава фактура" при 409.
- Интерактивна „Входяща кутия" за unmatched записи с dropdown фирма + Покупка/Продажба + бутон Потвърди.

### Devin Review фиксове (`fec6de4`)
1. Дубликати консумираха quota → преместих `_check_and_increment_usage` след duplicate check.
2. Non-deterministic EIK match → priority issuer > recipient.

---

## 13.6.1 Stage 3.5 — Conditional „Чакащи одобрение" subfolder (PR #18) ✅MERGED

### Backend
- `/api/files/folder-structure` брои pending cross-copies от `inv_invoice_meta` (не от disk) и добавя `pending` subfolder **само при count > 0**.
- `/api/invoicing/incoming` приема optional `company_id`.

### Frontend
- „Чакащи одобрение" секцията в `CompanyFolder` се rendere-ва само когато има записи; всеки ред показва № · издател · дата · сума + Одобри/Отхвърли бутони → викат Stage 2 endpoints. След approve записът излиза от pending и минава в „Фактури покупки".

---

## 13.7 Stage 4 — Email изпращане на фактури (PR #19) ✅MERGED

### Backend
- Alembic `0002_stage4_email_templates_and_log` (`41b033cfed1b → 2a6f1e9d3c4b`): 2 нови таблици.
  - `inv_email_templates` — `id, company_id, name, subject, body, is_default, created_at, updated_at`.
  - `inv_email_log` — `id, invoice_id, company_id, to_email, cc, bcc, subject, body, sent_at, delivered, opened_at, open_count, message_id, error`.
- Email sending през **Postfix localhost:25** с sender `noreply@megabanx.com`.
- Merge fields lenient: `{invoice_number}, {issue_date}, {due_date}, {total}, {currency}, {client_name}, {company_name}, {issuer_name}` (непознати placeholder-и минават непроменени).
- 7 нови endpoint-а: CRUD на шаблоните, `POST /invoicing/invoices/{id}/send-email` (с PDF attachment toggle), `GET /invoicing/invoices/{id}/email-log`, **unauth** `GET /invoicing/email/track/{log_id}.gif` (1×1 pixel за open tracking).
- Email изпращанията **не** консумират invoice quota. Failed sends не се retry-ват автоматично.

### Frontend
- Mail иконка на всеки ред → модал „Изпрати по имейл" (шаблон, to/cc/bcc, subject/body, merge-field chips, PDF toggle).
- Бутон „Имейл шаблони" в хедъра → двупанелен редактор (CRUD + `is_default`).
- Колона „Изпратено" + „дневник" линк → drawer със статус/дата/отваряния/грешка за всяко изпращане.

**Планиран follow-up (Stage 11 cutover):** миграция от Postfix към external provider (Resend/Brevo/SES) за по-добра доставимост.

---

## 13.8 Stage 5 — Sharing със счетоводител (PR #20) ✅MERGED

### Backend
- `app/services/access.py` — `CompanyAccess` enum + helper-и (`require_company_access`, `assert_can_upload`).
- `app/routers/sharing.py` rewrite: owner CRUD върху `inv_company_shares`, `GET /shared-companies`, `POST /shared-companies/{id}/leave`.
- Auto-link на pending покани при регистрация на нов имейл.
- Scoped read-access в `invoices.py` (list/get/download/folder-structure): shared user вижда само shared фирми + техните files.

### Frontend
- `leaveShare()` API + истински бутон „Напусни" в „Споделени с мен".
- Нов dropdown „Профил" във Файлове (Моите файлове ↔ Споделени от X); `CompanyFolder` приема optional `profileId`.

### Devin Review фиксове (`4dfab42`, `7ee327a`)
1. `folder-structure` leak-ваше counts/имена на несподелени фирми → филтър по allowed.
2. Early-return с празен `allowed` връщаше bare `[]` вместо `{"folders": []}`.

---

## 13.9 Stage 6A — Settings: profile + company + sync (PR #21) ✅MERGED

### Backend
- Alembic `0003_stage6a_company_contact_and_bank_accounts` (`2a6f1e9d3c4b → 4c8a1f2e5d6b`):
  - `companies` +5 колони: `vat_number, country (default 'България'), phone, email, logo_path`.
  - Нова таблица `inv_bank_accounts` (`id, company_id, iban, bic, bank_name, currency, is_default, created_at`).
- `PUT /api/auth/me` — смяна на име.
- `POST/DELETE /api/companies/{id}/logo` — upload (PNG/JPG, max 2 MB) + fetch.
- Bank accounts CRUD с invariant: винаги точно един `is_default` per company (преди INSERT/UPDATE unset-ва останалите).
- Sync settings: `PUT /api/invoicing/sync-settings` — mode (immediate/delayed/manual).

### Frontend
- Нова страница `/dashboard/settings` + sidebar item „Настройки" с 3 таба:
  - **Профил** — име (email read-only за сега).
  - **Фирма** — контактни данни, logo upload/preview/delete, BankAccounts grid (add/edit/delete/set-default).
  - **Синхронизация** — dropdown за mode.

---

## 13.10 Stage 6B — Invoice templates (4 designs) + email template preview (PR #22) ✅MERGED

### Backend
- Alembic `0004_stage6b_invoice_template` (`4c8a1f2e5d6b → 5d9c2f3b6a7e`):
  - `companies.invoice_template` (`String(32)`, default `"modern"`).
  - `inv_invoice_meta.template_id` (`String(32)`, nullable) — per-invoice override.
- Template resolution (в `_build_pdf_snapshot`): `meta.template_id → company.invoice_template → "modern"`.
- `pdf_service`:
  - `_resolve_template_file(doc_type, template_key) → filename` — map към Jinja2 файл.
  - `_encode_logo(path)` — data-URI embed.
  - `render_preview_pdf_bytes(key, document_type)` — sample PDF за gallery.
  - Async wrapper в `render_invoice_pdf` (`asyncio.to_thread` за WeasyPrint).
- Нови endpoint-и:
  - `GET /api/invoicing/invoice-templates` — gallery metadata (`{templates:[{key,name,description}]}`).
  - `GET /api/invoicing/invoice-templates/{key}/preview?document_type=invoice` — inline sample PDF, рендерът през `asyncio.to_thread`.
- `create_invoice` / `update_invoice` персистират `template_id` от payload-а.
- `create_company` вече правилно персистира `invoice_template` от request-а (fallback „modern").

### Jinja2 шаблони (`app/templates/`)
- `invoice_classic.html` — зелен акцент, класически минимален.
- `invoice_modern.html` = текущия `invoice_pdf.html` (запазен за backwards-compat).
- `invoice_branded.html` — голяма лого зона, виолетов акцент.
- `invoice_standard.html` — черно-бял консервативен.

### Frontend
- `invoiceTemplates.api.ts` — `list()` + `previewUrl()` (blob URL, caller revoke-ва).
- **Settings → Фирма → `InvoiceTemplateSection`** — 4 variant карти, бутон „Преглед" (full-PDF modal), save през `companiesApi.update`. Blob URL-и се revoke-ват **само на unmount** през `useRef` mirror (фикс на PR review finding — преди ревокваше всички cached URL-и при всеки нов preview).
- **`InvoiceForm`** — dropdown „Шаблон на PDF" (empty = фирмения default). `template_id` flow-ва през `toBackendPayload` при create/update.
- **`EmailTemplatesModal`** — живо „Преглед (с примерни данни)" под редактора с merge-field substitution (client-side, без backend call).

### Devin Review фиксове
1. 🟡 `create_company` пропускаше `invoice_template` от payload → сега се персистира (`58036c4`).
2. 🔴 Sync WeasyPrint в async endpoint блокираше event loop → `asyncio.to_thread` (`58036c4`).
3. 🟡 Blob URL cleanup ревокваше всички кеширани preview-и → ref mirror + empty-deps cleanup (`19cfbfe`).

---

## 13.11 Billing catalog + subscription meta (PR #30)

Минимална имплементация на `/api/billing/plans` и обогатяване на `/api/auth/me`
със `subscription` обект — достатъчно за да се покаже Абонамент страницата
(план-карти + статус банер) без Stripe. Пълната Stripe интеграция (checkout,
webhooks, trial activation, payments история, upgrade/downgrade) остава
за **Stage 9**.

### Backend

- `app/services/plans.py` — **нов модул** с plan catalog (4 плана, inv.bg референция):
  - Безплатен — 0 BGN, 1 фирма, 30 фактури/месец
  - Стандарт — 6 BGN, 1 фирма, неограничени фактури
  - Про — 12 BGN, 5 фирми, неограничени фактури (`popular: true`)
  - Бизнес — 24 BGN, неограничени фирми/фактури
  - `999_999` е "unlimited" sentinel — `SubscriptionStatus.tsx` рендерира ∞.
  - `get_plan(id)`, `plan_limits(id)`, `build_subscription_info(billing, companies, invoices)` helpers.
- `app/routers/billing.py`:
  - Нов `GET /api/billing/plans` → `PLANS` (статичен catalog).
  - Запазен `GET /api/billing/` (legacy shape за Качване banner).
- `app/routers/auth.py`:
  - `_subscription_for(user, db)` — чете `Billing`, брои `Company` by `profile_id` и `InvoiceMonthlyUsage` за текущия месец, forward-ва към `build_subscription_info`.
  - `GET /api/auth/me`, `PUT /api/auth/me`, `POST /api/auth/verify` → връщат `subscription` обект (shape ↔ `frontend-v2/src/types/auth.types.ts::SubscriptionInfo`).

### Frontend
- Без промени — `BillingPage`, `PlanCards`, `SubscriptionStatus`, `authStore.fetchUser` вече консумират правилните shape-ове; досега получаваха празни данни защото endpoint-ите липсваха.

---

## 13.12 Познати production инциденти

| Инцидент | Причина | Fix | PR |
|----------|---------|-----|-----|
| Blank page при клик на "Фактури" след Stage 1.2 deploy | `.env` на backend-а презаписан с `.env.example` по време на deploy → DB auth падаше → `/auth/me` 500 → frontend crash-ваше при render на празен state | Възстановен `.env` от `/opt/megabanx-v2/source/backend-v2.bak.1776796963/.env` + restart service. Future deploys трябва да изключват `.env`. | — (ръчен fix) |
| Blank page при клик на "Фактури" (след предния fix) | `API_BASE_URL` default-ваше на `https://megabanx.com/api` (v1!) защото `VITE_API_URL` не беше set при build → v2 frontend викаше v1 API → shape mismatch → `.reduce` на undefined crash-ваше целия React tree | `constants.ts`: default `window.location.origin + '/api'`. Defensive `folder.subfolders ?? []` в `CompanyFolder` и `FilesPage`. | #14 |

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

*Документ генериран на 18.04.2026 г., обновен на 22.04.2026 г. — добавени Stages 2-6B (cross-copy, AI upload, email, sharing, settings, invoice templates), PR-ове #15-#22 merged & deployed.*
