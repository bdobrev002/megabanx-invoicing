# Megabanx 2.0 — Анализ и Архитектурен План

## ЧАСТ 1: АНАЛИЗ НА ТЕКУЩИЯ СОФТУЕР

### 1.1 Текущо състояние на файловете

| Файл | Редове | Роля |
|------|--------|------|
| `App.tsx` | 4225 | Монолитен компонент — съдържа ВСИЧКО: auth, landing page, dashboard, файлове, история, нотификации, billing, company sharing, verification, WebSocket |
| `MainForm.tsx` | 1243 | Модул за издаване на фактури — клиенти, артикули, кочани, настройки, invoice form |
| `api.ts` | 383 | Всички API endpoint-и |
| `index.css` | ~200 | Tailwind + custom CSS анимации |

**Проблем**: App.tsx съдържа **50+ useState hooks**, **30+ handler функции**, **8 landing page секции** (~1200 реда само за landing), **6 dashboard tab-а** (~2000 реда за dashboard UI), плюс auth екрани и модални диалози. Всичко е в един файл.

### 1.2 Функционални области в App.tsx

#### A. Автентикация (редове ~108-384)
- 50+ useState hooks за целия app
- Login/Register/Verify flow с email код
- ToS acceptance
- Auto-login от email линкове
- Session check при зареждане

#### B. Landing Page (редове ~1186-2488)
- 8 секции: About, How it works, Screenshots, Security, Pricing, FAQ, About Us, Contact
- Navbar с mobile hamburger menu
- Sidebar навигация
- CSS анимации за "филмче" (анимирана демонстрация)
- ~1300 реда само за landing page

#### C. Dashboard Header + Tabs (редове ~2489-2610)
- Navbar с профил, admin линк, logout
- Stats карти (фирми, фактури, за обработка, известия)
- 6 tab-а: Фирми, Качване, Фактури, История, Известия, Абонамент

#### D. Фирми Tab (редове ~2613-2897)
- Company CRUD (create, update, delete)
- EIK Lookup от Търговски регистър
- Verification modal (банков превод, QR код, ID карта + selfie)
- Pending verifications list
- Company sharing (споделяне с контрагенти)
- Shared companies display
- Monthly usage / limit warnings

#### E. Качване Tab (редове ~2899-3053)
- Drag & Drop + File input upload
- AI обработка със SSE streaming progress
- Per-file processing status с анимации
- Processing results display
- Cross-copy results
- Duplicate resolution modal
- Usage limits

#### F. Фактури Tab (редове ~3055-3341)
- File browser tree (companies → purchases/sales/proformas)
- Multi-file selection (Ctrl+click, Shift+click, Shift+Arrow)
- File search с suggestions
- Company filter с suggestions
- Date range filter
- Sort by name/date
- Download/Delete selected
- Per-file actions: edit, sync, email, download, delete
- DeliveryTicks компонент (Viber-style checkmarks)
- SyncBadge компонент (lightning bolt icons)

#### G. История Tab (редове ~3343-3457)
- Invoice history table
- Filter: all/processed/unmatched
- Search с suggestions
- Company filter
- Date range filter
- Notification actions

#### H. Известия Tab (редове ~3447-3535)
- Notifications list
- Mark as read / delete
- Clear all

#### I. Абонамент Tab (редове ~3535-3686)
- Billing plans display
- Stripe checkout integration
- Trial activation
- Cancel/Reactivate subscription
- Payment history
- Billing portal

#### J. Modals (разпръснати из целия файл)
- Verification modal (QR + ID card)
- Auto-verified modal
- Process results modal
- Duplicate resolution modal
- VAT confirmation modal
- ToS modal
- Company share dialog
- Edit protection modal (в MainForm)

### 1.3 Функционални области в MainForm.tsx

#### A. State Management (редове 87-140)
- Invoice form state (document type, number, dates, lines, client, etc.)
- Client/Item/Stub lists
- Modal state
- Toast notifications
- Sync settings

#### B. Business Logic (редове 142-481)
- Open/load clients, items, settings, stubs
- Open invoice (new or edit)
- Save invoice (create/update)
- Delete invoice
- Sync invoices (batch + single)
- Calculate totals (subtotal, VAT, discount, total)
- Line item management (add, remove, insert, update)
- Edit protection modal (DOM manipulation)

#### C. UI Components (редове 513-1238)
- Toast notification
- Clients modal + client form
- Items modal + item form
- Stubs modal + stub form
- Invoice form modal (the main form)
  - Document type selector
  - Client search + picker
  - Invoice number + dates
  - Line items table
  - Totals calculation
  - Discount/VAT/Notes
  - Action buttons (save draft, issue, sync)
- Client picker modal
- Item picker modal
- TR Lookup modal
- Settings modal

### 1.4 API Structure (api.ts — 383 реда)

**Групи endpoints:**
1. **Auth** (5): register, login, verify, me, logout
2. **Profiles** (4): CRUD
3. **Companies** (4): CRUD (profile-scoped)
4. **EIK Lookup** (1): TR search
5. **Upload & Process** (3): upload, process, process-stream
6. **Inbox** (2): get, clear
7. **Folder Structure** (1): get
8. **Invoices** (2): get, clear
9. **Notifications** (3): get, delete, deleteAll
10. **File Operations** (7): download, preview, viewer, delete, batch download, batch delete
11. **Approval** (2): approve, resolve duplicate
12. **Billing** (8): plans, subscription, checkout, trial, cancel, reactivate, portal, payments
13. **Contact** (2): submit, settings
14. **Verification** (4): bank details, pending, delete pending, ID card verify
15. **Company Sharing** (8): share, shares, update, revoke, shared companies, shared folders, shared download
16. **QR Verification** (3): create session, status, QR image
17. **WebSocket** (1): URL generator
18. **Invoicing Module** (18): clients CRUD, items CRUD, invoices CRUD, stubs CRUD, settings, sync, email

**Общо: ~72 endpoint функции**

### 1.5 Основни проблеми

1. **Монолитен App.tsx** — 4225 реда е неуправляем
2. **Смесена логика** — auth, landing, dashboard, billing, sharing — всичко е в един компонент
3. **50+ useState** — state management е хаотичен
4. **Няма routing** — навигацията е чрез `authScreen` и `activeTab` state
5. **Дублиран код** — sidebar items се повтарят 3 пъти (landing, dashboard mobile, dashboard desktop)
6. **Inline стилове** — MainForm.tsx използва inline styles вместо CSS classes
7. **DOM manipulation** — `showEditProtectModal` създава елементи с `document.createElement`
8. **Липсващи типове** — много `Record<string, unknown>` и `as any` кастове
9. **Няма error boundaries** — грешка в един компонент срива всичко
10. **Няма lazy loading** — целият app се зарежда наведнъж

---

## ЧАСТ 2: АРХИТЕКТУРЕН ПЛАН ЗА MEGABANX 2.0

### 2.1 Технологичен стек

| Технология | Роля |
|-----------|------|
| **React 18+** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **React Router v6** | URL-based routing |
| **Zustand** | Global state management (лек, прост) |
| **TanStack Query** | Server state / data fetching / caching |
| **Tailwind CSS** | Styling |
| **Zod** | Runtime validation на API данни |

### 2.2 Директорна структура

```
frontend/src/
├── main.tsx                          (~20 реда)  — Entry point
├── App.tsx                           (~80 реда)  — Router setup + providers
├── vite-env.d.ts
│
├── api/                              — API layer
│   ├── client.ts                     (~40 реда)  — Base fetch wrapper (request function)
│   ├── auth.api.ts                   (~30 реда)  — Auth endpoints
│   ├── profiles.api.ts               (~25 реда)  — Profile CRUD
│   ├── companies.api.ts              (~60 реда)  — Company CRUD + EIK lookup
│   ├── files.api.ts                  (~80 реда)  — Upload, process, download, delete
│   ├── invoices.api.ts               (~50 реда)  — Invoice history endpoints
│   ├── notifications.api.ts          (~25 реда)  — Notification endpoints
│   ├── billing.api.ts                (~50 реда)  — Billing/subscription endpoints
│   ├── sharing.api.ts                (~60 реда)  — Company sharing endpoints
│   ├── verification.api.ts           (~50 реда)  — Verification endpoints (bank, QR, ID)
│   ├── invoicing.api.ts              (~80 реда)  — Invoicing module (clients, items, stubs, invoices)
│   ├── contact.api.ts                (~20 реда)  — Contact form
│   ├── admin.api.ts                  (~60 реда)  — Admin panel endpoints
│   ├── trLookup.api.ts               (~30 реда)  — Търговски регистър API
│   ├── pairing.api.ts                (~40 реда)  — Invoice pairing / mirroring endpoints
│   ├── lifecycle.api.ts              (~30 реда)  — Document lifecycle rules endpoints
│   ├── bankAccounts.api.ts           (~30 реда)  — Bank accounts CRUD
│   ├── stubs.api.ts                  (~30 реда)  — Stubs/numbering CRUD
│   ├── approval.api.ts               (~25 реда)  — Approve/reject pending invoices
│   ├── periodic.api.ts               (~40 реда)  — Periodic invoices CRUD + pause/resume
│   └── websocket.ts                  (~40 реда)  — WebSocket connection manager
│
├── stores/                           — Zustand stores
│   ├── authStore.ts                  (~60 реда)  — currentUser, authScreen
│   ├── profileStore.ts               (~50 реда)  — activeProfile, profiles
│   ├── companyStore.ts               (~50 реда)  — companies, expandedCompanies
│   ├── fileStore.ts                  (~40 реда)  — folderStructure, selectedFiles, fileStatuses
│   ├── invoiceStore.ts               (~40 реда)  — invoices (history), filters
│   ├── notificationStore.ts          (~30 реда)  — notifications
│   ├── billingStore.ts               (~40 реда)  — subscription, plans, usage
│   ├── uiStore.ts                    (~30 реда)  — error, success, loading states
│   ├── invoicingStore.ts             (~50 реда)  — invoicing module state (form, clients, items)
│   ├── adminStore.ts                 (~40 реда)  — admin panel state
│   ├── pairingStore.ts               (~30 реда)  — invoice pairing state
│   ├── lifecycleStore.ts             (~30 реда)  — document lifecycle rules state
│   └── verificationStore.ts          (~30 реда)  — verification flow state (method, step, pending)
│
├── hooks/                            — Custom hooks
│   ├── useAuth.ts                    (~40 реда)  — Login/register/verify/logout
│   ├── useCompanies.ts               (~50 реда)  — Company CRUD with TanStack Query
│   ├── useFiles.ts                   (~60 реда)  — Upload, process, file operations
│   ├── useInvoices.ts                (~40 реда)  — Invoice history queries
│   ├── useNotifications.ts           (~30 реда)  — Notification queries
│   ├── useBilling.ts                 (~50 реда)  — Billing queries + mutations
│   ├── useSharing.ts                 (~40 реда)  — Company sharing logic
│   ├── useWebSocket.ts               (~60 реда)  — WebSocket connection + auto-reconnect
│   ├── useFileSelection.ts           (~80 реда)  — Multi-select (Ctrl, Shift, Arrow keys)
│   ├── useInvoicing.ts               (~60 реда)  — Invoicing module logic
│   ├── useAdmin.ts                   (~50 реда)  — Admin panel queries
│   ├── useTrLookup.ts                (~40 реда)  — Търговски регистър lookup logic
│   ├── usePairing.ts                 (~50 реда)  — Invoice pairing logic + WebSocket sync
│   ├── useLifecycle.ts               (~40 реда)  — Document lifecycle rules
│   ├── useBankAccounts.ts            (~40 реда)  — Bank accounts CRUD
│   ├── useStubs.ts                   (~40 реда)  — Stubs/numbering management
│   ├── useVerification.ts            (~50 реда)  — Verification flow (bank/QR/ID) + polling
│   ├── useProfiles.ts                (~40 реда)  — Profile CRUD + switch
│   ├── useApproval.ts                (~30 реда)  — Approve/reject pending invoices
│   └── useUsageLimits.ts             (~40 реда)  — Monthly limits + warnings logic
│
├── types/                            — TypeScript типове
│   ├── auth.types.ts                 (~20 реда)
│   ├── company.types.ts              (~30 реда)
│   ├── file.types.ts                 (~40 реда)
│   ├── invoice.types.ts              (~40 реда)
│   ├── billing.types.ts              (~30 реда)
│   ├── notification.types.ts         (~15 реда)
│   ├── sharing.types.ts              (~20 реда)
│   ├── invoicing.types.ts            (~50 реда) — Client, Item, Stub, InvoiceLine, etc.
│   ├── admin.types.ts                (~30 реда)  — Admin user, stats, logs
│   ├── pairing.types.ts              (~25 реда)  — PairedInvoice, PairingStatus, MirrorEvent
│   ├── lifecycle.types.ts            (~25 реда)  — LifecycleRule, LifecycleAction, ShareStatus
│   ├── bankAccount.types.ts          (~15 реда)  — BankAccount, IBAN validation
│   ├── stub.types.ts                 (~20 реда)  — Stub, StubRange, StubAssignment
│   ├── verification.types.ts         (~25 реда)  — VerificationMethod, VerificationStatus, PendingVerification
│   ├── profile.types.ts              (~15 реда)  — Profile, ProfileCreate
│   └── approval.types.ts             (~15 реда)  — ApprovalAction, PendingInvoice
│
├── components/                       — Shared/reusable компоненти
│   ├── ui/                           — ДИЗАЙН СИСТЕМА (визия на бутони, полета, popup-и)
│   │   ├── Button.tsx                (~60 реда)  — Unified бутони: primary, secondary, danger, ghost, outline, link, icon-only, loading state, disabled state, размери (sm/md/lg)
│   │   ├── IconButton.tsx            (~30 реда)  — Кръгъл icon button (за toolbar actions)
│   │   ├── ButtonGroup.tsx           (~30 реда)  — Група от свързани бутони
│   │   ├── Input.tsx                 (~40 реда)  — Text input с label, error, helper text
│   │   ├── Select.tsx                (~40 реда)  — Dropdown select с search
│   │   ├── Checkbox.tsx              (~25 реда)  — Checkbox с label
│   │   ├── RadioGroup.tsx            (~30 реда)  — Radio buttons група
│   │   ├── TextArea.tsx              (~30 реда)  — Multi-line text input
│   │   ├── Modal.tsx                 (~80 реда)  — Unified popup прозорец: sizes (sm/md/lg/xl/full), header, body, footer, close button, backdrop click, escape key, animations (fade+slide)
│   │   ├── ConfirmDialog.tsx         (~60 реда)  — Confirm popup: icon, title, message, confirm/cancel бутони, danger variant
│   │   ├── AlertDialog.tsx           (~50 реда)  — Alert popup: info/success/warning/error variants
│   │   ├── DrawerPanel.tsx           (~60 реда)  — Slide-in panel от дясно (за детайли, settings)
│   │   ├── Toast.tsx                 (~50 реда)  — Toast notification: success/error/warning/info, auto-dismiss, stack
│   │   ├── Spinner.tsx               (~15 реда)  — Loading spinner
│   │   ├── Badge.tsx                 (~30 реда)  — Status badge: colors, dot variant, removable
│   │   ├── Tooltip.tsx               (~30 реда)  — Hover tooltip
│   │   ├── SearchInput.tsx           (~60 реда)  — Search с suggestions dropdown
│   │   ├── DateRangeFilter.tsx       (~40 реда)  — Date range picker
│   │   ├── Table.tsx                 (~60 реда)  — Reusable table: sortable headers, striped rows
│   │   ├── Pagination.tsx            (~40 реда)  — Page navigation
│   │   ├── Tabs.tsx                  (~40 реда)  — Tab navigation component
│   │   ├── Card.tsx                  (~30 реда)  — Content card wrapper
│   │   ├── EmptyState.tsx            (~30 реда)  — Empty state placeholder (icon + message + action)
│   │   └── ErrorBoundary.tsx         (~40 реда)
│   │
│   ├── layout/                       — Layout компоненти
│   │   ├── Navbar.tsx                (~80 реда)  — Top navigation bar
│   │   ├── Sidebar.tsx               (~70 реда)  — Left sidebar
│   │   ├── MobileMenu.tsx            (~60 реда)  — Mobile hamburger menu
│   │   ├── DashboardLayout.tsx       (~50 реда)  — Header + sidebar + content
│   │   └── LandingLayout.tsx         (~40 реда)  — Landing navbar + sidebar + content
│   │
│   ├── StatusBadge.tsx               (~40 реда)  — DeliveryTicks + SyncBadge combined
│   ├── Logo.tsx                      (~30 реда)  — MegaBanx SVG logo
│   ├── UsageMeter.tsx                (~60 реда)  — Monthly usage / limit warnings
│   ├── ProtectedRoute.tsx            (~20 реда)  — Auth guard for routes
│   ├── AdminRoute.tsx                (~20 реда)  — Admin-only route guard
│   │
│   ├── trLookup/                     — Компонент за Търговски Регистър
│   │   ├── TrLookupInput.tsx         (~80 реда)  — ЕИК поле + бутон "Провери" + auto-fill
│   │   └── TrResultCard.tsx          (~60 реда)  — Показва намерените данни от ТР (име, адрес, управител, статус)
│   │
│   ├── counterpartyRules/            — Правила за получаване на фактури от контрагенти
│   │   ├── RulesEditor.tsx           (~100 реда) — Editor за правила: формат (PDF/XML/UBL), канал (email/API/портал), честота, auto-approve
│   │   └── RulesSummary.tsx          (~50 реда)  — Компактен изглед на активните правила за контрагент
│   │
│   ├── documentLifecycle/            — ПРАВИЛА ЗА ЖИЗНЕН ЦИКЪЛ НА ДОКУМЕНТ
│   │   ├── LifecycleRulesEditor.tsx  (~120 реда) — Настройки кога документът да се:
│   │   │                                           • синхронизира (автоматично / ръчно / при промяна)
│   │   │                                           • изпраща до контрагент (веднага / при одобрение / ръчно)
│   │   │                                           • копира при контрагента (автоматично / при споделяне)
│   │   │                                           • изтрива (забрана ако е споделен, soft delete, архив)
│   │   │                                           • редактира (забрана след изпращане, версии при редакция)
│   │   ├── LifecycleTimeline.tsx     (~80 реда)  — Визуална timeline на всички действия с документа
│   │   ├── ShareWithCounterparty.tsx (~100 реда) — Споделяне с контрагент: изпращане, потвърждение, оттегляне
│   │   └── EditDeleteRules.tsx       (~80 реда)  — Какво се случва при редакция (нова версия, notification до контрагент) и при изтриване (блокиране ако е споделен, известяване)
│   │
│   ├── invoicePairing/               — СВЪРЗВАНЕ НА ФАКТУРА С "ДВОЙНИК" ПРИ КОНТРАГЕНТА
│   │   ├── PairingStatus.tsx         (~80 реда)  — Показва статус: paired/unpaired/pending, линк към двойника
│   │   ├── PairingMatcher.tsx        (~100 реда) — Автоматично и ръчно свързване: по номер, дата, сума, ЕИК
│   │   ├── MirrorSync.tsx            (~80 реда)  — Real-time sync между двойниците: статус промени (платена, сторнирана, редактирана), WebSocket notifications
│   │   └── PairingHistory.tsx        (~60 реда)  — История на промени по двойника: кой какво е променил кога
│   │
│   ├── companyData/                   — ДАННИ ЗА ФИРМИ (банкови сметки и др.)
│   │   ├── BankAccountsList.tsx      (~80 реда)  — Списък банкови сметки: IBAN, BIC, банка, валута, основна сметка
│   │   ├── BankAccountForm.tsx       (~80 реда)  — Добавяне/редакция на банкова сметка с валидация на IBAN
│   │   └── CompanyDetailsCard.tsx    (~60 реда)  — Компактен изглед на фирмени данни: ЕИК, ДДС, адрес, МОЛ, сметки
│   │
│   ├── verification/                  — ВЕРИФИКАЦИЯ НА ФИРМИ (3 метода)
│   │   ├── VerificationMethodChooser.tsx (~80 реда) — Избор на метод: банков превод, QR код, ID карта + селфи
│   │   ├── BankTransferVerify.tsx    (~100 реда) — Банков превод: IBAN, BIC, получател, код за верификация, copy button
│   │   ├── QrCodeVerify.tsx          (~80 реда)  — QR код за десктоп: генериране, показване, polling за резултат
│   │   ├── IdCardVerify.tsx          (~100 реда) — Лична карта + селфи: upload, camera capture, AI verification
│   │   └── AutoVerifiedSuccess.tsx   (~40 реда)  — Success modal при автоматично одобрение от AI
│   │
│   ├── profiles/                      — ПРОФИЛИ (множество профили на потребител)
│   │   ├── ProfileSwitcher.tsx       (~60 реда)  — Dropdown за превключване между профили
│   │   ├── ProfileForm.tsx           (~50 реда)  — Създаване/преименуване на профил
│   │   └── ProfileList.tsx           (~40 реда)  — Списък с всички профили
│   │
│   ├── addressParser/                 — ПАРСВАНЕ НА АДРЕСИ ОТ ТР
│   │   └── AddressDisplay.tsx        (~60 реда)  — Форматиране на адрес от ТР: разделяне на редове, населено място, улица, община
│   │
│   ├── crossCopy/                     — КРОС-КОПИЯ (фактури при контрагент)
│   │   ├── CrossCopyBadge.tsx        (~40 реда)  — Бадж показващ cross-copy статус на файл
│   │   └── CrossCopyResults.tsx      (~60 реда)  — Резултати от cross-copy при обработка
│   │
│   ├── usageLimits/                   — ЛИМИТИ И УПОТРЕБА
│   │   ├── InvoiceUsageMeter.tsx     (~60 реда)  — Месечна употреба фактури: текущо/лимит, 80%/90%/limit warnings
│   │   └── CompanyUsageMeter.tsx     (~50 реда)  — Употреба фирми: текущо/лимит, warnings, upgrade бутон
│   │
│   └── stubs/                         — НОМЕРАЦИЯ НА ДОКУМЕНТИ (КОЧАНИ)
│       ├── StubsList.tsx             (~80 реда)  — Списък кочани: номер от-до, тип документ, активен/изчерпан
│       ├── StubForm.tsx              (~100 реда) — Създаване/редакция: начален номер, краен номер, префикс, тип документ (фактура/проформа/дебитно/кредитно), автоматично следващ номер
│       ├── StubAssignment.tsx        (~60 реда)  — Присвояване на кочан към фирма + правила за автоматичен избор
│       └── StubUsageIndicator.tsx    (~40 реда)  — Визуален индикатор: използвани/оставащи номера, предупреждение при изчерпване
│
├── pages/                            — Page компоненти (routes)
│   │
│   ├── landing/                      — Landing page (публичен)
│   │   ├── LandingPage.tsx           (~60 реда)  — Container + section router
│   │   ├── HeroSection.tsx           (~80 реда)  — Hero + features grid
│   │   ├── HowItWorksSection.tsx     (~100 реда) — Steps + animated demo
│   │   ├── ScreenshotsSection.tsx    (~60 реда)  — Screenshot gallery
│   │   ├── SecuritySection.tsx       (~80 реда)  — Security features
│   │   ├── PricingSection.tsx        (~100 реда) — Plans + pricing cards
│   │   ├── FaqSection.tsx            (~100 реда) — Accordion FAQ
│   │   ├── AboutUsSection.tsx        (~80 реда)  — Team / company info
│   │   ├── ContactSection.tsx        (~100 реда) — Contact form
│   │   └── AnimatedDemo.tsx          (~200 реда) — CSS animated "филмче"
│   │
│   ├── legal/                        — Правни страници
│   │   ├── TermsPage.tsx             (~100 реда) — Общи условия
│   │   ├── PrivacyPage.tsx           (~100 реда) — Политика за поверителност
│   │   └── CookiePolicyPage.tsx      (~60 реда)  — Политика за бисквитки
│   │
│   ├── auth/                         — Auth екрани
│   │   ├── LoginPage.tsx             (~80 реда)  — Email + ToS
│   │   ├── RegisterPage.tsx          (~80 реда)  — Name + Email + ToS
│   │   ├── VerifyPage.tsx            (~60 реда)  — 6-digit code input
│   │   └── TosModal.tsx              (~60 реда)  — Модал за приемане на Общи условия при регистрация/логин
│   │
│   ├── dashboard/                    — Dashboard (authenticated)
│   │   ├── DashboardPage.tsx         (~80 реда)  — Stats + tab router
│   │   ├── StatsCards.tsx            (~40 реда)  — 4 stat cards
│   │   └── TabNavigation.tsx         (~50 реда)  — Tab bar
│   │
│   ├── companies/                    — Фирми tab
│   │   ├── CompaniesPage.tsx         (~60 реда)  — Company list container (собствени + споделени)
│   │   ├── CompanyCard.tsx           (~80 реда)  — Single company card с адрес, ЕИК, МОЛ, управители, съдружници
│   │   ├── OwnCompanyForm.tsx        (~150 реда) — Форма за СОБСТВЕНА фирма: ЕИК lookup от ТР, пълни данни (име, адрес, МОЛ, банкова сметка, ДДС номер, лого)
│   │   ├── CounterpartyForm.tsx      (~120 реда) — Форма за КОНТРАГЕНТ: ЕИК lookup, основни данни, правила за получаване на фактури
│   │   ├── PendingVerifications.tsx  (~80 реда)  — Списък фирми чакащи верификация с бутони за верификация/отказ
│   │   ├── ShareDialog.tsx           (~100 реда) — Company sharing modal: добави сътрудник, toggle upload права
│   │   ├── SharePermissions.tsx      (~60 реда)  — Управление на споделяния: списък, ON/OFF upload, revoke
│   │   └── SharedCompanies.tsx       (~80 реда)  — Споделени с мен фирми section
│   │
│   ├── upload/                       — Качване tab
│   │   ├── UploadPage.tsx            (~60 реда)  — Container
│   │   ├── DropZone.tsx              (~80 реда)  — Drag & drop + file input + upload progress bar
│   │   ├── ProcessingProgress.tsx    (~100 реда) — AI SSE streaming progress: per-file статус, анимации, общ прогрес
│   │   ├── InboxFileList.tsx         (~60 реда)  — Files waiting for processing
│   │   ├── ProcessResults.tsx        (~100 реда) — Results modal: stats grid (общо/обработени/грешки/дубликати), per-file детайли
│   │   ├── DuplicateResolver.tsx     (~120 реда) — Duplicate resolution modal: 3 избора (запази/замени/и двете) per duplicate
│   │   └── BatchApprove.tsx          (~60 реда)  — Одобряване на pending фактури от контрагенти
│   │
│   ├── files/                        — Фактури (file browser) tab
│   │   ├── FilesPage.tsx             (~80 реда)  — Container + filters
│   │   ├── FileFilters.tsx           (~80 реда)  — Search, company filter с suggestions, date range, sort
│   │   ├── CompanyFolder.tsx         (~100 реда) — Expandable company folder: purchases/sales/proformas/pending секции
│   │   ├── FileList.tsx              (~80 реда)  — File list within folder section
│   │   ├── FileRow.tsx               (~80 реда)  — Single file row: actions (edit/sync/email/download/delete), DeliveryTicks, SyncBadge
│   │   ├── FileActions.tsx           (~60 реда)  — Batch toolbar: download/delete selected, select all/none
│   │   ├── FileKeyboardNav.tsx       (~60 реда)  — Keyboard navigation: Ctrl+click, Shift+click, Arrow keys multi-select
│   │   └── SharedFilesSection.tsx    (~60 реда)  — Преглед на файлове от споделени фирми (read-only или с upload)
│   │
│   ├── history/                      — История tab
│   │   ├── HistoryPage.tsx           (~60 реда)  — Container
│   │   ├── HistoryFilters.tsx        (~80 реда)  — Filter bar
│   │   └── HistoryTable.tsx          (~100 реда) — Invoice history table
│   │
│   ├── notifications/                — Известия tab
│   │   ├── NotificationsPage.tsx     (~60 реда)  — Container
│   │   ├── NotificationItem.tsx      (~60 реда)  — Single notification: тип (cross_copy/unmatched/error), иконка, title, message, timestamp
│   │   └── NotificationList.tsx      (~80 реда)  — Notification items + clear all
│   │
│   ├── billing/                      — Абонамент tab
│   │   ├── BillingPage.tsx           (~60 реда)  — Container + sub-tabs (Планове / История / Фактури)
│   │   ├── PlanCards.tsx             (~120 реда) — Billing plan cards: популярен badge, promo badge, цена с/без ДДС, features list
│   │   ├── SubscriptionStatus.tsx    (~80 реда)  — Current subscription info: статус, план, валидност, usage
│   │   ├── SubscriptionActions.tsx   (~60 реда)  — Cancel/Reactivate/Stripe portal бутони
│   │   ├── VatConfirmDialog.tsx      (~60 реда)  — Потвърждение с ДДС калкулация: цена + 20% ДДС = общо
│   │   ├── TrialActivation.tsx       (~40 реда)  — Активиране на пробен период
│   │   └── PaymentHistory.tsx        (~60 реда)  — Payment list + billing invoices
│   │
│   └── invoicing/                    — Модул за издаване на фактури
│       ├── InvoicingModule.tsx        (~60 реда)  — Entry point / container
│       │
│       ├── form/                     — Invoice Form
│       │   ├── InvoiceForm.tsx       (~120 реда) — Main form container
│       │   ├── DocTypeSelector.tsx   (~40 реда)  — Document type radio buttons
│       │   ├── ClientSection.tsx     (~100 реда) — Client search + display
│       │   ├── InvoiceDetails.tsx    (~80 реда)  — Stub, number, dates, payment
│       │   ├── LineItemsTable.tsx    (~120 реда) — Line items with calculations
│       │   ├── TotalsSection.tsx     (~60 реда)  — Subtotal, discount, VAT, total
│       │   ├── NotesSection.tsx      (~40 реда)  — Notes + internal notes
│       │   └── FormActions.tsx       (~40 реда)  — Save draft / Issue / Cancel buttons
│       │
│       ├── clients/                  — Client management
│       │   ├── ClientListModal.tsx   (~100 реда) — Client list + search
│       │   ├── ClientForm.tsx        (~120 реда) — Create/Edit client
│       │   └── ClientPicker.tsx      (~60 реда)  — Quick client picker
│       │
│       ├── items/                    — Item management
│       │   ├── ItemListModal.tsx     (~100 реда) — Item list + search
│       │   ├── ItemForm.tsx          (~100 реда) — Create/Edit item
│       │   └── ItemPicker.tsx        (~60 реда)  — Quick item picker for lines
│       │
│       ├── settings/                 — Company invoicing settings
│       │   └── SettingsModal.tsx     (~80 реда)  — VAT, defaults, etc.
│       │
│       ├── pdf/                      — PDF generation (БЪДЕЩО)
│       │   ├── PdfPreview.tsx        (~100 реда) — PDF preview in modal
│       │   └── PdfTemplates.tsx      (~80 реда)  — PDF template selection
│       │
│       ├── email/                    — Email sending (БЪДЕЩО)
│       │   ├── EmailComposer.tsx     (~100 реда) — Email compose modal
│       │   └── EmailTemplates.tsx    (~60 реда)  — Email templates
│       │
│       ├── sync/                     — Sync & status
│       │   ├── SyncButton.tsx        (~40 реда)  — Per-invoice sync button
│       │   └── SyncStatus.tsx        (~40 реда)  — Sync status display
│       │
│       └── numbering/                — Номерация (използва shared stubs/ компонента)
│           └── NumberingPicker.tsx   (~50 реда)  — Избор на кочан + автоматичен следващ номер при създаване на документ
│
├── pages/admin/                      — АДМИН ПАНЕЛ (само за администратори)
│   ├── AdminLayout.tsx               (~60 реда)  — Admin sidebar + content layout
│   ├── AdminDashboard.tsx            (~100 реда) — Overview: общ брой потребители, фирми, фактури, приходи, графики
│   ├── UsersManagement.tsx           (~120 реда) — Списък потребители: search, filter, ban/unban, change plan, impersonate
│   ├── UserDetail.tsx                (~100 реда) — Детайли за потребител: профили, фирми, фактури, абонамент, история
│   ├── CompaniesOverview.tsx         (~100 реда) — Всички фирми: верификации pending, статуси, search
│   ├── VerificationReview.tsx        (~100 реда) — Преглед и одобрение на верификации (ID карти, банков превод)
│   ├── BillingOverview.tsx           (~100 реда) — Приходи, абонаменти, trials, churn rate
│   ├── SystemLogs.tsx                (~80 реда)  — System logs: errors, API calls, performance
│   └── AdminSettings.tsx             (~80 реда)  — Системни настройки: email templates, limits, feature flags
│
└── utils/                            — Utility functions
    ├── formatters.ts                 (~30 реда)  — Number/date/currency formatting
    ├── validators.ts                 (~30 реда)  — EIK, email, phone validation
    └── constants.ts                  (~20 реда)  — App-wide constants
```

### 2.3 Routing Plan

```
/                          → LandingPage (about)
/how                       → LandingPage (how it works)
/screenshots               → LandingPage (screenshots)
/security                  → LandingPage (security)
/pricing                   → LandingPage (pricing)
/faq                       → LandingPage (FAQ)
/about-us                  → LandingPage (about us)
/contact                   → LandingPage (contact)
/terms                     → TermsPage (Общи условия)
/privacy                   → PrivacyPage (Поверителност)
/cookies                   → CookiePolicyPage (Бисквитки)
/login                     → LoginPage
/register                  → RegisterPage
/verify                    → VerifyPage
/dashboard                 → DashboardPage (redirect to /dashboard/companies)
/dashboard/companies       → CompaniesPage
/dashboard/upload          → UploadPage
/dashboard/files           → FilesPage
/dashboard/history         → HistoryPage
/dashboard/notifications   → NotificationsPage
/dashboard/billing         → BillingPage
/admin                     → AdminDashboard (само за администратори)
/admin/users               → UsersManagement
/admin/users/:id           → UserDetail
/admin/companies           → CompaniesOverview
/admin/verifications       → VerificationReview
/admin/billing             → BillingOverview
/admin/logs                → SystemLogs
/admin/settings            → AdminSettings
```

### 2.4 State Management Strategy

```
┌─────────────────────────────────────────────────┐
│                  Zustand Stores                  │
│                                                  │
│  authStore      → currentUser, isAuthenticated   │
│  profileStore   → activeProfile, profiles[]      │
│  uiStore        → error, success, loading        │
│  invoicingStore → form state, modal state        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              TanStack Query                      │
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

**Zustand** — за UI state (кой е логнат, кой таб е активен, модални диалози)
**TanStack Query** — за server data (companies, invoices, notifications) с автоматичен cache, refetch, и invalidation

### 2.5 Типове документи (5 вида)

| # | Тип | Код | Описание |
|---|-----|-----|----------|
| 1 | **Фактура** | `invoice` | Стандартна фактура |
| 2 | **Проформа фактура** (тип 1) | `proforma` | Проформа към клиент |
| 3 | **Проформа фактура** (тип 2) | `proforma_received` | Получена проформа (НОВО) |
| 4 | **Дебитно известие** | `debit_note` | Увеличение на данъчна основа |
| 5 | **Кредитно известие** | `credit_note` | Намаление на данъчна основа |
| 6 | **Периодична фактура** | `periodic` | Автоматично генериране по график (НОВО) |

### 2.6 Компоненти за бъдещо развитие

#### 2.6.1 Email компонент (`pages/invoicing/email/`)
- Compose modal с To/CC/BCC
- Email templates (за фактура, за проформа, за reminder)
- Attachment на PDF
- История на изпратени имейли
- Status tracking (delivered, opened, bounced)

#### 2.6.2 Tickets / Notifications компонент (`pages/notifications/`)
- Real-time WebSocket notifications
- Notification categories (нова фактура, одобрение, reminder, system)
- Read/unread status
- Notification preferences (email, in-app, push)
- "Светкавички" — quick action buttons на всяка нотификация

#### 2.6.3 Invoice Status компонент (`components/StatusBadge.tsx`)
- Visual status pipeline: Draft → Issued → Sent → Delivered → Viewed → Paid
- DeliveryTicks (Viber-style checkmarks)
- SyncBadge (lightning bolts)
- Color-coded badges per status
- Status history timeline

#### 2.6.4 Clients компонент (`pages/invoicing/clients/`)
- Client list с search и pagination
- Client card с всички данни
- Client import от CSV/Excel
- Client merge (дублирани клиенти)
- Client statistics (брой фактури, оборот)

#### 2.6.5 Items/Articles компонент (`pages/invoicing/items/`)
- Item catalog с categories
- Price history
- Multiple VAT rates
- Units management
- Item import/export

#### 2.6.6 AI Processing компонент (`pages/upload/`)
- Streaming SSE progress
- Per-file status tracking
- Automatic company matching
- Automatic categorization (покупка/продажба)
- Smart duplicate detection
- OCR confidence scores

#### 2.6.7 PDF компонент (`pages/invoicing/pdf/`)
- PDF preview в модал
- Multiple PDF templates
- Company branding (лого, цветове)
- Batch PDF export
- PDF signing (електронен подпис — бъдещо)

#### 2.6.8 Periodic Invoices компонент (НОВО)
- Schedule setup (месечно, тримесечно, годишно)
- Template invoice за periodic
- Auto-generation на определена дата
- Email auto-send при генериране
- Pause/Resume/Cancel schedule
- Next generation date preview

### 2.7 Backend API Structure за 2.0

Текущият backend остава, но добавяме нови endpoints:

```
NEW Endpoints needed:

# Periodic Invoices
POST   /api/invoicing/periodic              — Create periodic schedule
GET    /api/invoicing/periodic              — List periodic schedules
PUT    /api/invoicing/periodic/{id}         — Update schedule
DELETE /api/invoicing/periodic/{id}         — Delete schedule
POST   /api/invoicing/periodic/{id}/pause   — Pause schedule
POST   /api/invoicing/periodic/{id}/resume  — Resume schedule

# Email
POST   /api/invoicing/invoices/{id}/send-email   — Send invoice via email
GET    /api/invoicing/invoices/{id}/email-history — Email delivery history

# PDF Templates
GET    /api/invoicing/pdf-templates         — List templates
POST   /api/invoicing/pdf-templates         — Create custom template
PUT    /api/invoicing/pdf-templates/{id}    — Update template

# Enhanced Notifications
GET    /api/notifications/preferences       — Get notification preferences
PUT    /api/notifications/preferences       — Update preferences

# Batch Sync (currently missing)
POST   /api/invoicing/sync/{companyId}      — Batch sync all unsynced invoices

# Proforma Type 2 (received)
POST   /api/invoicing/proforma-received     — Record received proforma
```

### 2.8 Deployment Strategy

```
┌──────────────────────────────────────────────┐
│                ТЕКУЩО                         │
│                                              │
│   megabanx.com  →  VPS 144.91.122.208       │
│   /opt/bginvoices/backend/ (Python/FastAPI)   │
│   /opt/bginvoices/frontend/ (React build)     │
│   Nginx reverse proxy                        │
│                                              │
│   GitHub: bdobrev002/megabanx-invoicing      │
│   Branch: main                               │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│              MEGABANX 2.0 ПЛАН               │
│                                              │
│   Фаза 1: new.megabanx.com                  │
│   - Нов Nginx vhost на същия VPS             │
│   - Нова frontend директория                 │
│   - Същия backend (shared API)               │
│   - Нов GitHub branch: v2.0                  │
│                                              │
│   Фаза 2: Тестване                           │
│   - Паралелна работа на двата сайта          │
│   - A/B тестване с реални потребители        │
│   - Постепенно мигриране                     │
│                                              │
│   Фаза 3: Превключване                       │
│   - new.megabanx.com → megabanx.com          │
│   - Стария сайт → old.megabanx.com (backup)  │
│   - DNS switch                               │
└──────────────────────────────────────────────┘
```

### 2.9 Приоритети за имплементация

#### Фаза 1 — Скелет ✅ ГОТОВА (PR #5)
1. Project setup (Vite + React + TypeScript + Tailwind + Router + Zustand + TanStack Query)
2. API layer (20 модула + WebSocket)
3. Types дефиниции (16 файла)
4. Stores setup (13 Zustand stores)
5. Layout компоненти (Navbar, Sidebar, DashboardLayout, LandingLayout)
6. Route structure
7. Auth flow (Login, Register, Verify) + Auth API интеграция

#### Фаза 2 — Дизайн + Съдържание ✅ ГОТОВА (PR #5)
1. Landing page (8 секции с реално съдържание от megabanx.com)
2. Navbar (dark gradient), Logo (SVG), 13 CSS анимации
3. Auth pages визия, UI компоненти (10)
4. Footer

#### Фаза 3 — Dashboard Core ✅ ГОТОВА (PR #6)
1. Company CRUD (CompaniesPage, CompanyCard, OwnCompanyForm, ShareDialog)
2. Upload page
3. Files browser (FilesPage)
4. History (HistoryPage, HistoryTable)
5. Notifications + Billing pages
6. 42 компонента общо

#### Фаза 4 — WebSocket + Invoicing ✅ ГОТОВА (PR #8)
1. Real-time WebSocket delivery tracking (delivery ticks)
2. InvoicingModule — Clients, Items, Stubs, Settings, Invoices CRUD
3. Session expiry увеличен на 180 дни
4. Backend invoicing router + schemas + models

#### Фаза 4.5 — Layout 1:1 copy + Legal ✅ ГОТОВА (PR #7, #8)
1. CSS класове копирани 1:1 от megabanx.com с Playwright
2. Privacy, Terms, Cookies pages + unified popup module
3. XSS fix: address rendering с React елементи

#### Фаза 5 — Production Deploy ✅ ГОТОВА
1. Backend v2 деплойнат на megabanx.duckdns.org (порт 8007, systemd)
2. Frontend v2 деплойнат (Nginx + SSL)
3. Пълен source код на сървъра (/opt/megabanx-v2/source/)

#### Фаза 6 — Admin панел (ПРЕДСТОИ)
1. Users management (search, ban, impersonate)
2. Companies overview + Verification review
3. Billing overview + System logs
4. Admin settings

#### Фаза 7 — DNS Switch (ПРЕДСТОИ)
1. megabanx.duckdns.org → megabanx.com
2. Старият сайт → old.megabanx.com
3. DNS switch

### 2.10 Файлова статистика за 2.0

| Категория | Брой файлове | Среден размер | Общо редове |
|-----------|-------------|---------------|-------------|
| API layer | 19 | ~42 реда | ~800 |
| Stores | 13 | ~40 реда | ~520 |
| Hooks (+ useWebSocket, useBillingRedirect) | 22 | ~45 реда | ~990 |
| Types | 15 | ~25 реда | ~375 |
| UI Components (Дизайн система — бутони, popup-и, полета) | 24 | ~40 реда | ~960 |
| Layout | 5 | ~60 реда | ~300 |
| Shared компоненти (ТР, Counterparty, StatusBadge, Verification, Profiles, Address, CrossCopy, UsageLimits, DocumentLifecycle, InvoicePairing, CompanyData, Stubs, DeliveryTicks, SyncBadge, CurrencyDisplay, LoadingScreen) | 34 | ~60 реда | ~2040 |
| Landing pages (+ ComparisonGrid, ProcessSteps, OldVsNewProcess, FaqItem) | 14 | ~80 реда | ~1120 |
| Legal pages (Общи условия, Поверителност, Бисквитки) | 3 | ~85 реда | ~260 |
| Auth pages (+ ToS modal) | 4 | ~70 реда | ~280 |
| Dashboard | 3 | ~55 реда | ~165 |
| Companies (Собствена фирма + Контрагенти + PendingVerifications + SharePermissions) | 9 | ~95 реда | ~855 |
| Upload (+ BatchApprove) | 7 | ~80 реда | ~560 |
| Files (+ KeyboardNav + SharedFiles) | 8 | ~75 реда | ~600 |
| History | 3 | ~80 реда | ~240 |
| Notifications (+ NotificationItem) | 3 | ~65 реда | ~200 |
| Billing (+ VatConfirm + TrialActivation + SubscriptionActions) | 7 | ~70 реда | ~480 |
| Invoicing (+ PaymentMethodSelector, VatReasonSelector, VatSettingsPanel, PriceModeToggle, InvoiceLineRow, UnitSelector, SyncSettingsPanel, DiscountInput, EditProtectionModal, InvoiceToast) | 28 | ~70 реда | ~1960 |
| **AI Сканиране** (ProcessResults, DuplicateResolution, AiExtractedData, ProcessProgress) | **6** | **~70 реда** | **~420** |
| **Email Шаблони** (Editor, Preview, 5 шаблона) | **7** | **~65 реда** | **~470** |
| **Брандинг** (LogoFull, LogoIcon, FaviconGenerator, BrandColors, OgMetaTags) | **5** | **~35 реда** | **~170** |
| **Админ панел** | **9** | **~95 реда** | **~840** |
| Utils (+ currency.ts) | 4 | ~30 реда | ~120 |
| DB Документация + Schema Viewer | 2 | ~100 реда | ~200 |
| **ОБЩО** | **~255 файла** | **~55 реда** | **~14215** |

**Сравнение**: Текущо 3 файла × ~5850 реда → 2.0: ~255 файла × ~55 реда средно

**Нито един файл няма да надвишава 200 реда**, с изключение на AnimatedDemo.tsx (~200 реда за CSS анимациите).
Всички `.tsx` компоненти ще са **под 150 реда** средно, далеч под лимита от 300-400 реда.

---

## ЧАСТ 3: РЕЗЮМЕ

### Какво ще се запази от текущия софтуер
- Целия backend (Python/FastAPI) — без промени
- Всички API endpoints — без промени
- Базата данни — без промени
- Бизнес логиката — преместена в правилни компоненти
- UI дизайна (Tailwind, цветове, иконки) — запазен
- Всички текущи функции — 100% пренесени

### Какво е НОВО в 2.0
- Proper routing с URLs
- Zustand + TanStack Query за state
- **~255 малки файла** вместо 3 огромни (~55 реда средно)
- **Админ панел** — пълно управление на потребители, фирми, верификации, приходи, логове
- **Дизайн система** — unified бутони (primary/secondary/danger/ghost), popup прозорци (Modal/Confirm/Alert/Drawer), форми
- **Форма за собствена фирма** — отделно от контрагенти, пълни данни + ДДС + лого
- **Компонент за ТР** — извличане на данни от Търговски Регистър по ЕИК
- **Правила за контрагенти** — формат, канал, честота на получаване на фактури
- **Верификация** — 3 отделни компонента (банков превод, QR, ID карта) вместо един монолит
- **Профили** — превключване между множество профили на потребител
- **Жизнен цикъл на документ** — правила за sync, изпращане, копиране, редакция, изтриване
- **Invoice pairing** — свързване на фактури с двойници при контрагент
- **Банкови сметки** — CRUD за фирмени банкови сметки
- **Кочани** — номерация с визуален индикатор за изчерпване
- **Крос-копия** — бадж и резултати за cross-copy при обработка
- **Лимити** — отделни компоненти за usage warnings (фактури + фирми)
- **Batch operations** — keyboard navigation, batch approve
- **VAT confirm dialog** — потвърждение с ДДС калкулация при checkout
- Error boundaries
- Lazy loading
- TypeScript strict mode
- Periodic invoices
- Enhanced email
- PDF templates
- Proforma тип 2 (получена)
- Enhanced notifications

### Какво НЕ се пипа
- Backend кода
- Базата данни
- megabanx.com (продължава да работи)
- Nginx конфигурацията на основния сайт

---

## ЧАСТ 4: ЗАЩИТА СРЕЩУ ПАТЧОВЕ И СКРИПТОВЕ

### 4.1 ESLint правила (забрана на DOM manipulation)

В `.eslintrc.js` ще добавим правила, които **блокират build-а** ако някой се опита да пише патч-подобен код:

```js
// Забранени patterns:
"no-restricted-globals": ["error", "document"],  // Няма директен document достъп
"no-restricted-properties": ["error",
  { object: "document", property: "createElement" },
  { object: "document", property: "getElementById" },
  { object: "document", property: "querySelector" },
  { object: "document", property: "write" },
],
"no-eval": "error",                    // Забранен eval()
"no-implied-eval": "error",            // Забранен implied eval
"no-new-func": "error",                // Забранен new Function()
```

**Изключения**: Само чрез `// eslint-disable-next-line` с коментар защо е нужно (напр. за React portals).

### 4.2 Build Validation Script

`scripts/validate-build.sh` — изпълнява се автоматично след всеки `npm run build`:

```bash
#!/bin/bash
# Проверява че dist/ съдържа САМО Vite-генерирани файлове
# Забранява ръчно добавени .js, .css или .html файлове

DIST_DIR="dist"

# 1. Проверка: Няма файлове извън assets/ и index.html
UNEXPECTED=$(find $DIST_DIR -type f ! -path "*/assets/*" ! -name "index.html" ! -name "vite.svg")
if [ -n "$UNEXPECTED" ]; then
  echo "ERROR: Unexpected files in build output:"
  echo "$UNEXPECTED"
  exit 1
fi

# 2. Проверка: index.html не съдържа inline скриптове
if grep -q "<script>" "$DIST_DIR/index.html" 2>/dev/null; then
  echo "ERROR: index.html contains inline scripts! Only Vite module scripts allowed."
  exit 1
fi

# 3. Проверка: Няма eval(), document.write, innerHTML в bundle
if grep -rl "eval\b\|document\.write\|\.innerHTML" "$DIST_DIR/assets/"*.js 2>/dev/null; then
  echo "WARNING: Potentially dangerous patterns found in bundle output."
fi

echo "Build validation passed."
```

### 4.3 `.agents/RULES.md` — Инструкции за AI агенти

Файл в корена на репото, който всеки AI агент (Devin, Copilot, и др.) ТРЯБВА да следва:

```markdown
# MEGABANX 2.0 — ПРАВИЛА ЗА ПРОМЕНИ

## АБСОЛЮТНО ЗАБРАНЕНО:
1. Патчване на build output файлове (dist/, build/)
2. Инжектиране на скриптове в index.html
3. Ръчно редактиране на dist/ или build/ папките
4. DOM manipulation с document.createElement, innerHTML, document.write
5. Директен SSH deploy без build от source код
6. Добавяне на inline <script> тагове в HTML
7. Използване на eval(), new Function(), или подобни
8. Модифициране на bundle файлове след build
9. Качване на файлове директно на сървъра без Git commit

## ЗАДЪЛЖИТЕЛЕН WORKFLOW:
1. Промени САМО в source код (src/ папката)
2. npm run build (включва ESLint + build validation)
3. Git commit + push
4. Deploy от build output (автоматичен)

## ПРИ НАРУШЕНИЕ:
- Build-ът ще гърми с грешка
- Pre-commit hook ще блокира commit-а
- CI/CD pipeline ще откаже deploy
```

### 4.4 Git Pre-commit Hook

Автоматичен hook чрез `husky` + `lint-staged`:

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && node scripts/check-no-dist.js"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

`scripts/check-no-dist.js`:
```js
// Блокира commit-и които съдържат файлове от dist/
const { execSync } = require('child_process');
const staged = execSync('git diff --cached --name-only').toString();
const forbidden = staged.split('\n').filter(f =>
  f.startsWith('dist/') || f.startsWith('build/') ||
  f.endsWith('.patch') || f.endsWith('.inject.js')
);
if (forbidden.length > 0) {
  console.error('BLOCKED: Cannot commit build output or patch files:');
  forbidden.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
}
```

### 4.5 CI/CD Pipeline Protection

GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Build & Deploy
on:
  push:
    branches: [main, v2.0]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint          # ESLint с забраните правила
      - run: npm run build         # Vite build
      - run: bash scripts/validate-build.sh  # Build validation
      - run: npm test              # Unit tests

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        run: |
          # САМО автоматичен deploy от CI
          # Никой не може да качи файлове ръчно
          scp -r dist/* server:/opt/bginvoices/frontend/
```

### 4.6 Runtime Protection (в самия сайт)

```typescript
// src/utils/integrityCheck.ts
// Проверява при зареждане че няма инжектирани скриптове

export function checkPageIntegrity() {
  // Брой <script> тагове — трябва да е точно 1 (Vite module)
  const scripts = document.querySelectorAll('script');
  const externalScripts = Array.from(scripts).filter(
    s => !s.src.includes('/assets/') && s.src !== ''
  );

  if (externalScripts.length > 0) {
    console.error('INTEGRITY WARNING: Unexpected scripts detected!');
    // Може да изпрати notification до admin
  }
}
```

### 4.7 Резюме на защитите

| Ниво | Защита | Кога действа |
|------|--------|-------------|
| **1. ESLint** | Забранява DOM manipulation в source | При `npm run lint` / build |
| **2. Build Validation** | Проверява dist/ за чистота | След `npm run build` |
| **3. RULES.md** | Инструкции за AI агенти | При всяка AI сесия |
| **4. Pre-commit Hook** | Блокира commit на dist/ файлове | При `git commit` |
| **5. CI/CD Pipeline** | Автоматичен build + deploy | При `git push` |
| **6. Runtime Check** | Детектира инжектирани скриптове | При зареждане на сайта |

**6 нива на защита** — от source код до runtime. Невъзможно е да се промъкне патч или скрипт.

---

---

## ЧАСТ 5: НОВИ КОМПОНЕНТИ — ПРЕДЛОЖЕНИЯ ОТ АНАЛИЗА НА КОДА

Следните компоненти са идентифицирани от пълния анализ на App.tsx (4225 реда), MainForm.tsx (1243 реда) и api.ts (383 реда). Те НЕ съществуваха в предишните версии на плана и са добавени на база реален код:

### 5.1 Верификация (components/verification/) — 5 файла
В текущия App.tsx верификацията е един огромен блок (~200 реда) с 3 метода смесени в един модал.
В 2.0 всеки метод е отделен компонент:
- **VerificationMethodChooser** — избор между 3 метода
- **BankTransferVerify** — IBAN, BIC, код за верификация, copy бутон
- **QrCodeVerify** — генериране на QR, polling за резултат от мобилно устройство
- **IdCardVerify** — upload/camera + AI верификация
- **AutoVerifiedSuccess** — success modal когато AI одобри автоматично

### 5.2 Профили (components/profiles/) — 3 файла
Текущо профилите се управляват с inline state в App.tsx.
- **ProfileSwitcher** — dropdown в navbar за бързо превключване
- **ProfileForm** — създаване/преименуване
- **ProfileList** — списък с всички профили

### 5.3 Адреси от ТР (components/addressParser/) — 1 файл
Парсването на адрес от Търговски Регистър е хардкоднато в App.tsx.
- **AddressDisplay** — форматиране на адрес: населено място, улица, община

### 5.4 Крос-копия (components/crossCopy/) — 2 файла
Cross-copy логиката е вплетена в ProcessResults и FileRow.
- **CrossCopyBadge** — визуален бадж на файл показващ cross-copy статус
- **CrossCopyResults** — резултати от cross-copy при AI обработка

### 5.5 Лимити и употреба (components/usageLimits/) — 2 файла
Текущо usage warnings са inline в Companies и Upload секциите.
- **InvoiceUsageMeter** — месечна употреба фактури: 80%/90%/limit warnings
- **CompanyUsageMeter** — лимит фирми с upgrade бутон

### 5.6 Pending Verifications (pages/companies/) — 1 файл
В App.tsx има ~60 реда за показване на фирми чакащи верификация.
- **PendingVerifications** — списък фирми чакащи верификация с бутони

### 5.7 Share Permissions (pages/companies/) — 1 файл
Текущо permission управлението е вътре в ShareDialog.
- **SharePermissions** — управление на споделяния: списък, ON/OFF upload, revoke

### 5.8 Batch Approve (pages/upload/) — 1 файл
Текущо approve на pending фактури е inline в Upload секцията.
- **BatchApprove** — одобряване на pending фактури от контрагенти

### 5.9 File Keyboard Navigation (pages/files/) — 1 файл
Текущо keyboard навигацията (Ctrl+click, Shift+click, Arrow keys) е ~80 реда inline.
- **FileKeyboardNav** — multi-select keyboard shortcuts

### 5.10 Shared Files Section (pages/files/) — 1 файл
Текущо файловете от споделени фирми се показват смесено с основните.
- **SharedFilesSection** — отделен преглед на файлове от споделени фирми

### 5.11 Notification Item (pages/notifications/) — 1 файл
Текущо всяка нотификация е inline JSX.
- **NotificationItem** — тип, иконка, title, message, timestamp, quick actions

### 5.12 Billing разширения (pages/billing/) — 3 файла
Текущо subscription actions и VAT калкулация са inline.
- **SubscriptionActions** — Cancel/Reactivate/Stripe portal бутони
- **VatConfirmDialog** — потвърждение с ДДС калкулация при checkout
- **TrialActivation** — активиране на пробен период

### 5.13 ToS Modal (pages/auth/) — 1 файл
Текущо Terms of Service модалът е inline в Login/Register.
- **TosModal** — модал за приемане на Общи условия

### 5.14 Допълнителни API/Hooks/Stores/Types — 10 файла
- **approval.api.ts** — approve/reject pending invoices
- **periodic.api.ts** — periodic invoices CRUD + pause/resume
- **verificationStore.ts** — verification flow state
- **useVerification.ts** — verification flow hook
- **useProfiles.ts** — profile CRUD + switch
- **useApproval.ts** — approve/reject pending invoices
- **useUsageLimits.ts** — monthly limits + warnings logic
- **verification.types.ts** — VerificationMethod, VerificationStatus
- **profile.types.ts** — Profile, ProfileCreate
- **approval.types.ts** — ApprovalAction, PendingInvoice

### 5.15 Валути & Финанси (Currency & Finance) — 4 файла
В MainForm.tsx EUR_TO_BGN = 1.95583 е хардкоднато (ред 139), 14 метода на плащане са inline select (ред 1094-1099), и отстъпката има EUR/% toggle (ред 1019-1023).
- **currency.ts** (utils/) — EUR_TO_BGN константа + toBgn() + formatCurrency() + formatBgn() помощни функции
- **CurrencyDisplay.tsx** (shared/) — Показва сума в EUR + BGN еквивалент отдолу. Използва се в TotalsSection за данъчна основа, ДДС и обща сума
- **PaymentMethodSelector.tsx** (invoicing/form/) — Dropdown с 14 метода на плащане: В брой, Банков път, Наложен платеж, С карта, Платежно нареждане, Чек/Ваучер, Насрещно прихващане, Паричен превод, E-Pay, PayPal, Stripe, EasyPay, Пощенски превод, Друг
- **DiscountInput.tsx** (invoicing/form/) — Поле за отстъпка с EUR/% toggle switch

### 5.16 ДДС компоненти (VAT Components) — 3 файла
В MainForm.tsx ДДС настройките включват 8 хардкоднати основания за неначисляване (ред 1051-1060), toggle за цена с/без ДДС (ред 939-943) и checkbox за неначисляване.
- **VatReasonSelector.tsx** (invoicing/form/) — Dropdown с 8 основания по ЗДДС: чл. 21 ал. 2, чл. 28, чл. 41, чл. 42, чл. 50 ал. 1, чл. 113 ал. 9, чл. 7, и "Друго" (ръчно въвеждане)
- **VatSettingsPanel.tsx** (invoicing/form/) — Панел: checkbox "Не начислявай ДДС" + VatReasonSelector + логика за нулиране на ДДС ставките по всички редове
- **PriceModeToggle.tsx** (invoicing/form/) — Toggle в header на таблицата: "Цена без ДДС" / "Цена с ДДС" с преизчисляване на цените

### 5.17 Фактурни елементи (Invoice Form Sub-components) — 4 файла
В MainForm.tsx всеки ред от таблицата е ~50 реда inline JSX (ред 949-996), единиците мерки са хардкоднати (ред 977-979), sync настройките са 3 radio бутона (ред 1111-1120), и има модал за защита при редакция (ред 447-481).
- **InvoiceLineRow.tsx** (invoicing/form/) — Един ред от артикулната таблица: drag handle, insert/remove бутони, описание input, item picker бутон, количество + UnitSelector, цена с PriceModeToggle логика, ДДС ставка select (20%/9%/0%), стойност на реда
- **UnitSelector.tsx** (invoicing/form/) — Dropdown с 10 мерни единици: бр., кг, м, л, м², м³, час, ден, мес., услуга
- **SyncSettingsPanel.tsx** (invoicing/form/) — 3 radio бутона за режим на синхронизация: Ръчно, Веднага, След определено време + input за минути закъснение
- **EditProtectionModal.tsx** (invoicing/) — Модал при опит за редакция на вече синхронизирана фактура: предупреждение + опции

### 5.18 Статус индикатори (Status Indicators) — 2 файла
В App.tsx DeliveryTicks (ред 1066-1083) и SyncBadge (ред 1086-1095) са inline компоненти.
В плана имаше StatusBadge.tsx (~40 реда) който ги комбинира, но те трябва да са ОТДЕЛНИ за reusability:
- **DeliveryTicks.tsx** (shared/) — Viber-style тикове: двойни сини (одобрена), двойни сиви (pending), единично сиво (обработена), двойни червени (получена от контрагент), единично teal (no subscriber)
- **SyncBadge.tsx** (shared/) — Lightning bolt SVG иконки: синя (synced), червена (sync error), сива (не синхронизирана), с count overlay

### 5.19 Landing Page под-компоненти — 4 файла
HowItWorksSection.tsx в текущия App.tsx е ~280+ реда (comparison grid + 4-step animation + old vs new). Трябва да се раздели на под-компоненти:
- **ComparisonGrid.tsx** (landing/) — "Преди vs С MegaBanx vs Резултат": 3 карти с числа (4 часа → 2 мин → 80 часа спестени), тагове, иконки
- **ProcessSteps.tsx** (landing/) — 4-стъпков анимиран инфографик: Издаване/Качване → AI разпознаване → Клиент одобрява → Счетоводител тегли, с CSS анимации (fadeSlideUp, bounceGentle)
- **OldVsNewProcess.tsx** (landing/) — Визуално сравнение на стар процес (5 стъпки с червени X) vs нов процес (3 стъпки със зелени ✓)
- **FaqItem.tsx** (landing/) — Единичен разгъващ се FAQ елемент: въпрос + иконка + анимирано разгъване/свиване на отговора

### 5.20 Споделени/Reusable компоненти — 3 файла
Логото на MegaBanx е дублирано 3+ пъти (landing navbar, auth екрани, dashboard header). Loading spinner е също дублиран.
- **LogoSvg.tsx** (shared/) — MegaBanx SVG лого компонент с размери (sm/md/lg), използван в Navbar, Auth, Dashboard
- **LoadingScreen.tsx** (shared/) — Full-screen loading spinner с gradient background, използван при auth check и profile loading
- **InvoiceToast.tsx** (invoicing/) — Toast notification специфичен за invoicing модула: success/error с auto-dismiss

### 5.21 Hooks — 2 файла
WebSocket логиката (ред 973-1045 в App.tsx) е ~70 реда с reconnect, ping/pong, QR verification handling. Billing redirect (ред 1047-1061) е отделен useEffect.
- **useWebSocket.ts** (hooks/) — WebSocket connection management: auto-reconnect с 3s delay, ping/pong на 25s, QR verification events, profile-aware connection
- **useBillingRedirect.ts** (hooks/) — Обработка на billing URL параметри: ?billing=success → активиране, ?billing=cancel → error, URL cleanup

### 5.22 AI Сканиране — Данни извлечени от AI (components/aiScan/) — 6 файла
В App.tsx AI обработката е ~90 реда SSE streaming (ред 560-616), ProcessResultsModal е ~95 реда (ред 3958-4053), и DuplicateModal е ~90 реда (ред 4056-4146).
AI извлича: invoice_type, company_name, date, issuer_name, recipient_name, invoice_number, status, is_credit_note, cross_copy_status.
- **ProcessResultsModal.tsx** (~100 реда) — Модал с резултати от AI обработка: summary stats (общо/обработени/грешки/дубликати), детайли по файл, крос-копия
- **ProcessResultItem.tsx** (~50 реда) — Един резултат: original_filename, new_filename, company_name, invoice_number, status icon (processed/error/unmatched/duplicate), error_message
- **ProcessProgressBar.tsx** (~60 реда) — Real-time progress: SSE streaming, текущ файл, current/total, per-file status (чакащ/обработва се/готов/грешка), timer
- **DuplicateResolutionModal.tsx** (~80 реда) — 3-choice dialog за дублирани фактури: Замени/Запази и двете/Пропусни, per-file избор
- **AiExtractedDataCard.tsx** (~80 реда) — Карта с всички данни извлечени от AI: тип документ, издател, получател, номер, дата, сума, ДДС, артикули (отворен/затворен), статус на разпознаване
- **useAiProcessing.ts** (hooks/) — Hook за SSE streaming: start processing, handle events (start/file_processing/progress/complete), progress state, file status tracking

### 5.23 PostgreSQL структура (docs/database/) — 2 файла
Документация на базата данни + фронтенд компонент за визуализация в админ панела:
- **DATABASE_SCHEMA.md** (docs/) — Пълна схема на PostgreSQL: таблици (users, profiles, companies, invoices, notifications, subscriptions, verifications, shares, stubs, clients, items, settings), релации, индекси, типове
- **DatabaseSchemaViewer.tsx** (pages/admin/) — Визуален преглед на DB схемата в админ панела: таблици със стрелки за релации, row counts, размер на таблици

### 5.24 Email Шаблони (Email Templates) — 7 файла
В текущия код `sendInvoiceEmail` (api.ts ред 381-382) изпраща емайли, но няма визуален editor за шаблоните. В 2.0 добавяме:
- **EmailTemplateEditor.tsx** (~120 реда) — Визуален editor за HTML емайл шаблони: live preview, плейсхолдъри ({{company_name}}, {{invoice_number}}, {{total}}), цветова схема
- **EmailPreview.tsx** (~80 реда) — Preview на емайла както ще изглежда за получателя: десктоп/мобилен изглед
- **EmailTemplateInvoiceSent.tsx** (~60 реда) — Шаблон 1: "Изпратена фактура" — издател, номер, дата, сума, PDF линк, бутон "Преглед"
- **EmailTemplateInvoiceReceived.tsx** (~60 реда) — Шаблон 2: "Получена нова фактура" — от контрагент, номер, сума, бутони "Одобри"/"Отхвърли"
- **EmailTemplateVerification.tsx** (~50 реда) — Шаблон 3: "Код за верификация" — 6-цифрен код, валидност, брандинг
- **EmailTemplatePayment.tsx** (~50 реда) — Шаблон 4: "Успешно плащане" — план, сума, период, invoice link
- **EmailTemplateCrossCopy.tsx** (~50 реда) — Шаблон 5: "Крос-копия на фактура" — издател, получател, номер, бутон "Виж в MegaBanx"

### 5.25 Брандинг & Визуална идентичност (Branding) — 5 файла
Логото на MegaBanx е inline SVG дублирано 3+ пъти. Фавиконът няма компонент. В 2.0 създаваме пълна брандинг система:
- **LogoFull.tsx** (~40 реда) — Пълно лого: SVG иконка + "МегаBanх" текст с цветове (indigo + orange), размери (sm/md/lg/xl)
- **LogoIcon.tsx** (~30 реда) — Само иконката (без текст): за favicon, мобилен header, малки пространства
- **FaviconGenerator.tsx** (~40 реда) — Генериране на favicon в различни размери: 16x16, 32x32, 180x180 (apple-touch-icon), manifest иконки
- **BrandColors.ts** (~30 реда) — Централизирани бранд цветове: primary (indigo-600), accent (orange-400), success (green), error (red), градиенти, теми (light/dark)
- **OgMetaTags.tsx** (~30 реда) — Open Graph / SEO meta тагове: og:image, og:title, og:description, twitter:card, structured data за всяка страница

---

## ЧАСТ 3: MEGABANX 2.0 BACKEND — ПЛАН ЗА ИМПЛЕМЕНТАЦИЯ

### 6.1 Технологичен стек (Backend v2)

| Технология | Версия | Роля |
|-----------|--------|------|
| Python | 3.12+ | Backend runtime |
| FastAPI | latest | Web framework + REST API |
| SQLAlchemy | 2.0 (async) | ORM с `Mapped[]` типизация |
| asyncpg | latest | Async PostgreSQL драйвер |
| PostgreSQL | 16 | Единна база данни (`megabanx_v2`) |
| Pydantic | v2 | Валидация + сериализация |
| Google Gemini | 2.5-flash | AI разпознаване на фактури (замества OpenAI от v1) |
| Fernet (AES-256) | — | Файлово криптиране (backward-compatible с v1) |
| smtplib + asyncio | — | Async email (OTP кодове, споделяне, нотификации) |
| Alembic | — | Database миграции |
| httpx | — | Async HTTP клиент (EIK lookup) |
| pdfplumber | — | PDF text extraction |
| Pillow | — | Image processing |
| python-multipart | — | File uploads |

### 6.2 Ключови промени спрямо v1

| v1 (backend/main.py) | v2 (backend-v2/) |
|----------------------|-------------------|
| 1 файл, ~2960 реда | ~40 файла, ~100 реда средно |
| 2 отделни бази (bginvoices + invoicing) | 1 единна база (`megabanx_v2`) с 25 таблици |
| JSON файлове за данни (`load_users()` / `save_users()`) | PostgreSQL с SQLAlchemy async ORM |
| Синхронен SMTP email | Async email чрез `asyncio.to_thread()` |
| OpenAI за AI анализ | Google Gemini 2.5-flash |
| Всичко в глобален scope | Dependency injection (FastAPI `Depends`) |
| Без миграции | Alembic за DB миграции |
| Без session expiry | 30-дневен TTL на сесии с автоматично изтриване |
| In-memory OTP | In-memory OTP (6-цифрен, 10 мин, 5 опита) — готов за Redis в production |
| Нито един import организиран | Модулна структура: models/ schemas/ routers/ services/ utils/ |

### 6.3 Директорна структура

```
backend-v2/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, lifespan (auto-create tables), 12 router registrations
│   ├── config.py             # Pydantic Settings (.env): DATABASE_URL, GEMINI_API_KEY, ENCRYPTION_KEY, SMTP, etc.
│   ├── database.py           # Async engine (asyncpg, pool_size=10, max_overflow=20) + session factory
│   ├── dependencies.py       # get_current_user (cookie/Bearer + session expiry check + commit on delete)
│   │
│   ├── models/               # SQLAlchemy ORM — 25 таблици, всички Mapped[] typed
│   │   ├── __init__.py       # Base + re-exports на всички модели
│   │   ├── base.py           # DeclarativeBase
│   │   ├── user.py           # users, sessions (с expires_at), tos_consents
│   │   ├── profile.py        # profiles
│   │   ├── company.py        # companies, company_verifications
│   │   ├── invoice.py        # invoices, pending_invoices, approval_tokens, duplicate_requests
│   │   ├── notification.py   # notifications
│   │   ├── sharing.py        # company_shares
│   │   ├── billing.py        # billing, invoice_monthly_usage (UniqueConstraint user+year+month)
│   │   ├── invoicing.py      # inv_clients, inv_items, inv_stubs, inv_company_settings,
│   │   │                     # inv_invoice_meta, inv_invoice_lines, inv_sync_settings
│   │   ├── drive.py          # drive_links
│   │   ├── email_link.py     # invoice_email_links
│   │   ├── contact.py        # contact_inquiries
│   │   └── admin.py          # admin_settings
│   │
│   ├── schemas/              # Pydantic v2 request/response models (model_config from_attributes=True)
│   │   ├── __init__.py
│   │   ├── auth.py           # RegisterReq, LoginReq, VerifyReq, UserOut
│   │   ├── profile.py        # ProfileCreate, ProfileUpdate, ProfileOut
│   │   ├── company.py        # CompanyCreate, CompanyUpdate, CompanyOut
│   │   ├── invoice.py        # InvoiceOut, BatchDownloadRequest (без destination_path!)
│   │   ├── sharing.py        # ShareReq, ShareUpdate, ShareOut
│   │   ├── invoicing.py      # ClientReq/Out, ItemReq/Out, StubReq/Out, InvoiceCreateReq, InvoiceLineReq, etc.
│   │   └── contact.py        # ContactReq
│   │
│   ├── routers/              # FastAPI APIRouter модули (10 рутера)
│   │   ├── __init__.py
│   │   ├── auth.py           # POST register, login, verify, logout; GET /me
│   │   ├── profiles.py       # CRUD /api/profiles
│   │   ├── companies.py      # CRUD /api/profiles/{id}/companies + GET /api/lookup-eik/{eik}
│   │   ├── invoices.py       # Upload + AI, list, download (decrypted), delete, inbox, folder structure
│   │   ├── notifications.py  # List, mark read (PUT), mark all read, delete
│   │   ├── sharing.py        # Share by email, list/update/revoke shares, shared companies view
│   │   ├── billing.py        # Plan info + monthly usage stats
│   │   ├── invoicing.py      # Full CRUD: clients, items, stubs, issued invoices (с lines), settings, sync
│   │   ├── admin.py          # Stats, user list, key-value settings (admin-only)
│   │   └── contact.py        # Public contact form submission
│   │
│   ├── services/             # Business logic (без HTTP зависимости)
│   │   ├── __init__.py
│   │   ├── auth_service.py   # OTP generation/verification (in-memory), session tokens (secrets.token_hex)
│   │   ├── email_service.py  # Async SMTP: send_otp_email, send_share_invitation/notification_email
│   │   │                     #   HTML-escaped templates, asyncio.to_thread() wrapper
│   │   ├── encryption.py     # Fernet AES-256: write_encrypted_file, read_decrypted_file (v1 compatible)
│   │   ├── gemini.py         # Google Gemini AI invoice analysis (image + PDF → structured JSON)
│   │   ├── eik_lookup.py     # Търговски регистър API integration (detail + summary endpoints)
│   │   ├── file_manager.py   # Profile/company folder creation, path helpers, sanitize_path_component()
│   │   └── google_drive.py   # Google Drive sync (placeholder — returns None, needs v1 port)
│   │
│   └── utils/
│       ├── __init__.py
│       └── helpers.py        # sanitize_filename, format_date, etc.
│
├── alembic/                  # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 001_initial.py    # Initial migration (25 таблици)
│
├── pyproject.toml            # Poetry/pip dependencies
├── .env.example              # Example environment variables
└── .gitignore
```

### 6.4 PostgreSQL схема — 25 таблици в единна база `megabanx_v2`

#### Auth & Users

| Таблица | Полета | Забележки |
|---------|--------|-----------|
| `users` | id (UUID PK), email (unique), name, is_admin, profile_id (FK), created_at | Основен потребител |
| `sessions` | id (UUID PK), user_id (FK→users), token (unique, indexed), expires_at, created_at | 30-дневен TTL, commit-then-raise при expiry |
| `tos_consents` | id (UUID PK), user_id (FK→users), version, accepted_at | Съгласие с общи условия |

#### Profiles & Companies

| Таблица | Полета | Забележки |
|---------|--------|-----------|
| `profiles` | id (UUID PK), user_id (FK→users), name, created_at | Множество профили на user |
| `companies` | id (UUID PK), profile_id (FK→profiles), name, eik, vat_number, address, mol, drive_*_folder_id/path, created_at | Фирми; name санитизирано с sanitize_path_component() |
| `company_verifications` | id (UUID PK), profile_id (FK), eik, company_name, method, status, verification_code, created_at | 3 метода: банков превод, QR, ID карта |

#### Invoices (AI Upload)

| Таблица | Полета | Забележки |
|---------|--------|-----------|
| `invoices` | id (UUID PK), profile_id, original_filename, new_filename, invoice_type, company_id, company_name, date, issuer_name/eik/vat, recipient_name/eik/vat, invoice_number, total_amount, vat_amount, destination_path, status (processed/unmatched), source (scan), created_at | destination_path скрит от API response |
| `pending_invoices` | id (UUID PK), profile_id, filename, company_name, status, token, created_at | За одобрение от контрагент |
| `approval_tokens` | id (UUID PK), pending_invoice_id (FK), token (unique), expires_at | Еднократни линкове за одобрение |
| `duplicate_requests` | id (UUID PK), invoice_id (FK), original_id (FK), action, created_at | Резолюция на дублирани фактури |

#### Social & Notifications

| Таблица | Полета | Забележки |
|---------|--------|-----------|
| `notifications` | id (UUID PK), profile_id, type, title, message, filename, source, is_read, created_at | Real-time чрез WebSocket |
| `company_shares` | id (UUID PK), company_id (FK), owner_profile_id (FK), shared_with_email, permission, status, created_at | Споделяне; email изпращане СЛЕД db.flush() |

#### Billing

| Таблица | Полета | Забележки |
|---------|--------|-----------|
| `billing` | id (UUID PK), user_id (FK, unique), plan, invoices_limit, companies_limit, stripe_customer_id, stripe_subscription_id, status, expires_at | Лимити по план |
| `invoice_monthly_usage` | id (UUID PK), user_id (FK), year, month, count | UniqueConstraint(user_id, year, month); SELECT FOR UPDATE за atomicity |

#### Invoicing Module (издаване на фактури)

| Таблица | Полета | Забележки |
|---------|--------|-----------|
| `inv_clients` | id (UUID PK), company_id (FK), profile_id, name, eik, vat_number, address, mol, created_at | Клиенти за фактуриране |
| `inv_items` | id (UUID PK), company_id (FK), profile_id, name, unit, price (Numeric), vat_rate (Numeric), created_at | Артикули с финансова прецизност |
| `inv_stubs` | id (UUID PK), company_id (FK), profile_id, name, prefix, start_number, end_number, next_number, doc_type, created_at | Кочани; next_number > end_number → 409 |
| `inv_company_settings` | id (UUID PK), company_id (FK), profile_id, default_vat_rate, default_currency, payment_method, bank_account, notes_template | Настройки по фирма |
| `inv_invoice_meta` | id (UUID PK), company_id (FK), profile_id, client_id (FK), stub_id (FK), doc_type, invoice_number, date, due_date, subtotal/discount/vat_amount/total (Numeric), payment_method, notes, status, created_at | WITH FOR UPDATE за stub increment |
| `inv_invoice_lines` | id (UUID PK), invoice_id (FK→inv_invoice_meta), item_id, name, quantity, unit, unit_price, vat_rate, total (all Numeric) | Редове; поне 1 задължителен |
| `inv_sync_settings` | id (UUID PK), company_id (FK), profile_id, auto_sync, sync_on_issue, email_on_issue, default_email | Настройки за синхронизация |

#### Other

| Таблица | Полета | Забележки |
|---------|--------|-----------|
| `drive_links` | id (UUID PK), invoice_id (FK), drive_file_id, drive_url, synced_at | Google Drive връзки |
| `invoice_email_links` | id (UUID PK), invoice_id (FK), email, sent_at, status | Имейл изпращане на фактури |
| `contact_inquiries` | id (UUID PK), name, email, message (max 500), created_at | Контактна форма (public) |
| `admin_settings` | id (UUID PK), key (unique), value | Key-value настройки |

#### Релации

```
users ──1:N──> sessions (с expires_at)
users ──1:N──> tos_consents
users ──1:1──> billing ──1:N──> invoice_monthly_usage
users ──1:N──> profiles ──1:N──> companies
                   │                  │
                   │                  ├──1:N──> inv_clients
                   │                  ├──1:N──> inv_items
                   │                  ├──1:N──> inv_stubs
                   │                  ├──1:1──> inv_company_settings
                   │                  ├──1:N──> inv_invoice_meta ──1:N──> inv_invoice_lines
                   │                  ├──1:1──> inv_sync_settings
                   │                  └──1:N──> company_shares
                   │
                   ├──1:N──> company_verifications
                   ├──1:N──> invoices ──1:N──> drive_links
                   │              └──1:N──> invoice_email_links
                   ├──1:N──> pending_invoices ──1:N──> approval_tokens
                   └──1:N──> notifications
```

### 6.5 API Endpoints (10 рутера, ~65 endpoint функции)

#### 6.5.1 Auth Router (`/api/auth`)

| Метод | Endpoint | Описание | Защита |
|-------|----------|----------|--------|
| POST | `/register` | Регистрация (email + name + ToS) → изпраща OTP | Public |
| POST | `/login` | Вход (email) → изпраща OTP | Public |
| POST | `/verify` | Верификация на OTP код → връща session token + cookie | Public |
| POST | `/logout` | Изтриване на session | Authenticated |
| GET | `/me` | Текущ потребител | Authenticated |

**OTP flow**: 6-цифрен код, 10 мин expiry, 5 опита, in-memory store. Session cookie `session_token` с 30-дневен `max_age`.

#### 6.5.2 Profiles Router (`/api/profiles`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/` | Списък профили на потребителя |
| POST | `/` | Създаване на нов профил |
| PUT | `/{profile_id}` | Обновяване на профил |
| DELETE | `/{profile_id}` | Изтриване на профил |

#### 6.5.3 Companies Router (`/api/profiles/{profile_id}/companies`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/` | Списък фирми за профил |
| POST | `/` | Създаване на фирма (name санитизирано, folders на диска) |
| PUT | `/{company_id}` | Обновяване (setattr за SQLAlchemy change tracking) |
| DELETE | `/{company_id}` | Изтриване на фирма |
| GET | `/api/lookup-eik/{eik}` | Търсене в Търговски регистър |

#### 6.5.4 Invoices Router (`/api/profiles/{profile_id}`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/upload` | Upload + AI анализ + криптиране + company matching |
| GET | `/invoices` | Списък фактури (filter: company_id, invoice_type) |
| GET | `/invoices/{id}` | Детайли на фактура |
| GET | `/invoices/{id}/download` | Download (декриптиран) |
| DELETE | `/invoices/{id}` | Изтриване на фактура + файл |
| GET | `/inbox` | Несъответстващи фактури |
| GET | `/folder-structure` | Дърво: фирми → покупки/продажби → файлове |

**Upload flow**: Валидация (формат, размер 20MB) → inbox (криптиран) → Gemini AI анализ → company match по EIK → rename → move → DB record → notification ако unmatched.

#### 6.5.5 Notifications Router (`/api/notifications`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/` | Списък нотификации |
| PUT | `/{id}/read` | Маркиране като прочетена |
| PUT | `/read-all` | Маркиране на всички |
| DELETE | `/{id}` | Изтриване |

#### 6.5.6 Sharing Router (`/api/sharing`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/` | Споделяне на фирма по email (email СЛЕД db.flush()) |
| GET | `/` | Списък споделяния |
| PUT | `/{share_id}` | Обновяване на permission |
| DELETE | `/{share_id}` | Отмяна на споделяне |
| GET | `/shared-companies` | Фирми споделени с мен |

#### 6.5.7 Billing Router (`/api/billing`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/plans` | Налични планове |
| GET | `/` | Текущ план + usage stats |

#### 6.5.8 Invoicing Router (`/api/invoicing`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| **Clients** | | |
| GET | `/clients` | Списък клиенти |
| POST | `/clients` | Създаване |
| PUT | `/clients/{id}` | Обновяване |
| DELETE | `/clients/{id}` | Изтриване |
| **Items** | | |
| GET | `/items` | Списък артикули |
| POST | `/items` | Създаване |
| PUT | `/items/{id}` | Обновяване |
| DELETE | `/items/{id}` | Изтриване |
| **Stubs** | | |
| GET | `/stubs` | Списък кочани |
| POST | `/stubs` | Създаване |
| PUT | `/stubs/{id}` | Обновяване |
| DELETE | `/stubs/{id}` | Изтриване |
| **Invoices** | | |
| GET | `/invoices` | Списък издадени фактури |
| POST | `/invoices` | Създаване (stub validation, ≥1 line, VAT на discounted amount) |
| PUT | `/invoices/{id}` | Обновяване |
| DELETE | `/invoices/{id}` | Изтриване |
| **Settings** | | |
| GET | `/settings` | Настройки за фактуриране по фирма |
| PUT | `/settings` | Обновяване на настройки |
| **Sync** | | |
| GET | `/sync-settings` | Настройки за синхронизация |
| PUT | `/sync-settings` | Обновяване |

**Invoice creation flow**: Validate ≥1 line → find stub → check next_number ≤ end_number (409 ако изчерпан) → calculate subtotal → validate discount ≤ subtotal → VAT = (subtotal - discount) × vat_rate → WITH FOR UPDATE за stub increment.

#### 6.5.9 Admin Router (`/api/admin`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/stats` | Dashboard статистики |
| GET | `/users` | Списък потребители |
| GET | `/settings` | Admin настройки (key-value) |
| PUT | `/settings` | Обновяване на настройки (JSON body) |

#### 6.5.10 Contact Router (`/api/contact`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/` | Изпращане на контактно съобщение (public, max 500 chars) |

### 6.6 Services (Business Logic)

#### 6.6.1 auth_service.py — OTP & Sessions
```
otp_store: Dict[str, OTPRecord]  # In-memory (email → code + expires + attempts)
generate_otp(email) → str        # 6-цифрен код, 10 мин expiry, 5 опита
verify_otp(email, code) → bool   # Проверка + автоматично изтриване
generate_session_token() → str   # secrets.token_hex(32) — криптографски сигурен
```

#### 6.6.2 email_service.py — Async SMTP
```
send_email(to, subject, html_body) → None     # asyncio.to_thread(_send_email_sync)
send_otp_email(to, code) → None               # HTML template с html.escape()
send_share_invitation_email(to, owner, company) → None
send_share_notification_email(to, owner, company) → None
```
**Сигурност**: Всички user-supplied стойности минават през `html.escape()` преди HTML insertion (XSS prevention).

#### 6.6.3 encryption.py — Fernet AES-256
```
write_encrypted_file(path, data: bytes) → None
read_decrypted_file(path) → bytes
```
Backward-compatible с v1 encryption. Key от `ENCRYPTION_KEY` env var.

#### 6.6.4 gemini.py — Google Gemini AI
```
analyze_invoice_with_gemini(file_path) → dict
```
Подържа image (JPEG, PNG) и PDF файлове. Извлича: invoice_type, company_name, date, issuer_name/eik/vat, recipient_name/eik/vat, invoice_number, total_amount, vat_amount, items[].

#### 6.6.5 eik_lookup.py — Търговски регистър
```
lookup_eik(eik: str) → dict
```
Два endpoint-а: detail и summary от brra.bg API.

#### 6.6.6 file_manager.py — File System
```
sanitize_path_component(name) → str    # Strips /, \, .., null bytes, leading dots
get_profile_dir(profile_id) → str
get_inbox_dir(profile_id) → str
create_company_folders(profile_id, company_name) → None
```
**Сигурност**: `sanitize_path_component()` се прилага на company names и upload filenames преди `os.path.join()`.

#### 6.6.7 google_drive.py — Google Drive (placeholder)
```
upload_to_drive(file_path, folder_id) → Optional[str]  # Returns None (not yet implemented)
```
Needs porting from v1.

### 6.7 Сигурност — приложени защити

| # | Защита | Къде | Как |
|---|--------|------|-----|
| 1 | **Session expiry** | dependencies.py | 30-дневен TTL; `await db.commit()` преди `raise HTTPException` |
| 2 | **Path traversal** | file_manager.py | `sanitize_path_component()` strips /, \, .., null bytes |
| 3 | **XSS в emails** | email_service.py | `html.escape()` на всички user-supplied стойности |
| 4 | **Info disclosure** | schemas/invoice.py | `destination_path` премахнат от `InvoiceOut` response |
| 5 | **Stub overflow** | routers/invoicing.py | Проверка `next_number > end_number` → 409 |
| 6 | **Email atomicity** | routers/sharing.py | Email изпращане СЛЕД `db.flush()` |
| 7 | **Empty invoice** | routers/invoicing.py | Валидация ≥1 line; discount ≤ subtotal |
| 8 | **Billing atomicity** | routers/invoices.py | `SELECT FOR UPDATE` + `UniqueConstraint` на usage |
| 9 | **Concurrent stubs** | routers/invoicing.py | `WITH FOR UPDATE` при stub increment |
| 10 | **Async I/O** | email_service.py | `asyncio.to_thread()` за SMTP (не блокира event loop) |
| 11 | **SQLAlchemy tracking** | routers/companies.py | `setattr()` вместо `__dict__[]` за change detection |
| 12 | **Upload filename** | routers/invoices.py | `sanitize_path_component(file.filename)` |

### 6.8 Ред на имплементация (фази)

#### Фаза 1 — Core Infrastructure ✅
1. Project setup: pyproject.toml, .env.example, .gitignore
2. config.py (Pydantic Settings)
3. database.py (async engine + session factory)
4. dependencies.py (get_current_user)
5. models/base.py (DeclarativeBase)
6. main.py (FastAPI app, CORS, lifespan, router registrations)

#### Фаза 2 — Models ✅
1. Всички 25 SQLAlchemy модела в 12 файла
2. Mapped[] typed syntax, UUID PKs, datetime timestamps
3. Decimal/Numeric за финансови полета
4. Relationships и constraints (UniqueConstraint, ForeignKey)

#### Фаза 3 — Schemas ✅
1. 7 Pydantic v2 schema модула
2. Request и Response модели за всеки endpoint
3. `model_config = {"from_attributes": True}` за ORM compatibility
4. Скриване на вътрешни полета (destination_path)

#### Фаза 4 — Services ✅
1. auth_service.py — OTP + session management
2. email_service.py — Async SMTP с HTML templates
3. encryption.py — Fernet файлово криптиране
4. gemini.py — AI invoice analysis
5. eik_lookup.py — Търговски регистър API
6. file_manager.py — File system operations + sanitization
7. google_drive.py — Placeholder

#### Фаза 5 — Routers ✅
1. auth.py — Register/login/verify/me/logout
2. profiles.py — CRUD
3. companies.py — CRUD + EIK lookup
4. invoices.py — Upload + AI + list/download/delete
5. notifications.py — CRUD
6. sharing.py — Share/list/update/revoke
7. billing.py — Plans + usage
8. invoicing.py — Full CRUD (clients, items, stubs, invoices, settings, sync)
9. admin.py — Stats + users + settings
10. contact.py — Contact form

#### Фаза 6 — Bug Fixes (7 рунда Devin Review) ✅
- **Round 1-4**: 16 бъга (enum values, async I/O, concurrent access, TOCTOU billing, VAT calculation)
- **Round 5**: Session expiry, async email callers, XSS, info disclosure
- **Round 6**: Path traversal, stub overflow, email-before-commit, empty invoice lines
- **Round 7**: SQLAlchemy change tracking, expired session rollback, upload filename sanitization

#### Фаза 7 — Production Deploy ✅ ГОТОВА
1. Backend v2 деплойнат на VPS (uvicorn + systemd, порт 8007)
2. Nginx reverse proxy + SSL (Certbot)
3. PostgreSQL база megabanx_v2
4. WebSocket endpoint за real-time notifications
5. Session expiry 180 дни

#### Фаза 8 — Предстои
1. Google Drive sync port от v1
2. Stripe billing integration port от v1
3. Admin панел frontend
4. DNS switch: megabanx.duckdns.org → megabanx.com

### 6.9 Зависимости (pyproject.toml)

```toml
[project]
dependencies = [
    "fastapi",
    "uvicorn[standard]",
    "sqlalchemy[asyncio]",
    "asyncpg",
    "alembic",
    "pydantic",
    "pydantic-settings",
    "python-dotenv",
    "httpx",
    "google-genai",
    "pdfplumber",
    "Pillow",
    "cryptography",
    "python-multipart",
]
```

### 6.10 Environment Variables (.env)

```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/megabanx_v2
GEMINI_API_KEY=...
ENCRYPTION_KEY=...           # Fernet key (base64, 32 bytes)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=noreply@megabanx.com
ALLOWED_ORIGINS=https://megabanx.com,https://new.megabanx.com
DATA_DIR=/opt/bginvoices/data
```

### 6.11 Deployment план (ИЗПЪЛНЕН)

```
1. PostgreSQL 16 на VPS (144.91.122.208)              ✅
   CREATE DATABASE megabanx_v2;

2. Backend v2 deploy (порт 8007)                     ✅
   systemd service: megabanx-v2-backend.service
   uvicorn app.main:app --host 127.0.0.1 --port 8007 --workers 2

3. Frontend v2 deploy                                  ✅
   /opt/megabanx-v2/frontend-dist/ (Vite production build)

4. Nginx reverse proxy                                 ✅
   megabanx.duckdns.org/api → localhost:8007
   megabanx.duckdns.org     → frontend-dist/

5. SSL с certbot                                       ✅
   certbot --nginx -d megabanx.duckdns.org

6. Пълен source код на сървъра                        ✅
   /opt/megabanx-v2/source/backend-v2/
   /opt/megabanx-v2/source/frontend-v2/
   /opt/megabanx-v2/source/Architecture-2.0.md
   /opt/megabanx-v2/source/megabanx-2.0-plan.md
```

---

*Обновен на 21.04.2026 г. — всички фази 1-5 завършени, production deploy на megabanx.duckdns.org*
