import { useEffect, useRef, useState, useCallback } from 'react'
import { User as UserIcon, Building2, RefreshCw, Save, Upload, Trash2, Plus, Star, StarOff, FileText, Check } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { useDialogStore } from '@/stores/dialogStore'
import { authApi } from '@/api/auth.api'
import { companiesApi } from '@/api/companies.api'
import { bankAccountsApi, type BankAccountPayload } from '@/api/bankAccounts.api'
import { invoicingApi, type SyncSettings } from '@/api/invoicing.api'
import { invoiceTemplatesApi, type InvoiceTemplateVariant } from '@/api/invoiceTemplates.api'
import type { Company } from '@/types/company.types'
import type { BankAccount } from '@/types/bankAccount.types'

type TabKey = 'profile' | 'company' | 'sync'

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>('profile')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')} icon={<UserIcon size={14} />} label="Профил" />
        <TabButton active={tab === 'company'} onClick={() => setTab('company')} icon={<Building2 size={14} />} label="Фирма" />
        <TabButton active={tab === 'sync'} onClick={() => setTab('sync')} icon={<RefreshCw size={14} />} label="Синхронизация" />
      </div>

      {tab === 'profile' && <ProfileTab />}
      {tab === 'company' && <CompanyTab />}
      {tab === 'sync' && <SyncTab />}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-md transition whitespace-nowrap ${
        active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

/* ─────────────────────────── Profile tab ─────────────────────────── */

function ProfileTab() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const setError = useUiStore((s) => s.setError)
  const setSuccess = useUiStore((s) => s.setSuccess)

  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)

  // Sync the local `name` buffer when the user changes (e.g. after fetchUser).
  // State writes happen in a microtask IIFE to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    void Promise.resolve().then(() => setName(user?.name ?? ''))
  }, [user?.name])

  const save = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Името трябва да е поне 2 символа')
      return
    }
    setSaving(true)
    try {
      const updated = await authApi.updateMe(trimmed)
      setUser(updated)
      setSuccess('Името е запазено')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при запис')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 max-w-xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Личен профил</h2>
      <div className="space-y-4">
        <Field label="Имейл">
          <input
            value={user?.email ?? ''}
            disabled
            className="w-full px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">Смяна на имейл (с OTP потвърждение) — скоро.</p>
        </Field>

        <Field label="Име">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Вашето име"
            className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Field>

        <div>
          <button
            onClick={save}
            disabled={saving || name.trim() === (user?.name ?? '').trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Spinner size="sm" /> : <Save size={16} />}
            Запис
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Company tab ─────────────────────────── */

function CompanyTab() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const setError = useUiStore((s) => s.setError)
  const setSuccess = useUiStore((s) => s.setSuccess)

  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const list = await companiesApi.list(profileId)
        if (cancelled) return
        setCompanies(list)
        if (list.length && !selectedId) setSelectedId(list[0].id)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Грешка при зареждане на фирми')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  const selected = companies.find((c) => c.id === selectedId) ?? null

  const updateCompanyLocal = (c: Company) => {
    setCompanies((prev) => prev.map((x) => (x.id === c.id ? c : x)))
  }

  if (loading) {
    return <div className="bg-white rounded-lg shadow-sm p-5"><Spinner /></div>
  }
  if (!companies.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5">
        <p className="text-sm text-gray-600">
          Нямате регистрирана фирма. Отидете в секция „Фирми" и добавете първата си фирма, за да настроите контакти, банкови сметки и лого.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Фирма</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.eik})
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <>
          <CompanyContactSection
            key={`contact-${selected.id}`}
            profileId={profileId}
            company={selected}
            onSaved={updateCompanyLocal}
            setError={setError}
            setSuccess={setSuccess}
          />
          <CompanyLogoSection
            key={`logo-${selected.id}`}
            profileId={profileId}
            company={selected}
            setError={setError}
            setSuccess={setSuccess}
          />
          <BankAccountsSection
            key={`bank-${selected.id}`}
            profileId={profileId}
            companyId={selected.id}
            setError={setError}
            setSuccess={setSuccess}
          />
          <InvoiceTemplateSection
            key={`tpl-${selected.id}`}
            profileId={profileId}
            company={selected}
            onSaved={updateCompanyLocal}
            setError={setError}
            setSuccess={setSuccess}
          />
        </>
      )}
    </div>
  )
}

function CompanyContactSection({
  profileId,
  company,
  onSaved,
  setError,
  setSuccess,
}: {
  profileId: string
  company: Company
  onSaved: (c: Company) => void
  setError: (msg: string) => void
  setSuccess: (msg: string) => void
}) {
  const [form, setForm] = useState({
    name: company.name,
    address: company.address ?? '',
    city: company.city ?? '',
    country: company.country ?? 'България',
    phone: company.phone ?? '',
    email: company.email ?? '',
    mol: company.mol ?? '',
    vat_number: company.vat_number ?? '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const updated = await companiesApi.update(profileId, company.id, form)
      onSaved(updated)
      setSuccess('Данните за фирмата са запазени')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при запис')
    } finally {
      setSaving(false)
    }
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Контакти и данни</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Име на фирмата">
          <TextInput value={form.name} onChange={(v) => set('name', v)} />
        </Field>
        <Field label="ДДС номер">
          <TextInput value={form.vat_number} onChange={(v) => set('vat_number', v)} placeholder="BG123456789" />
        </Field>
        <Field label="МОЛ">
          <TextInput value={form.mol} onChange={(v) => set('mol', v)} />
        </Field>
        <Field label="Телефон">
          <TextInput value={form.phone} onChange={(v) => set('phone', v)} placeholder="+359 ..." />
        </Field>
        <Field label="Имейл">
          <TextInput value={form.email} onChange={(v) => set('email', v)} placeholder="office@firma.bg" />
        </Field>
        <Field label="Град">
          <TextInput value={form.city} onChange={(v) => set('city', v)} />
        </Field>
        <Field label="Държава">
          <TextInput value={form.country} onChange={(v) => set('country', v)} />
        </Field>
        <Field label="Адрес" className="md:col-span-2">
          <TextInput value={form.address} onChange={(v) => set('address', v)} />
        </Field>
      </div>
      <div className="mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Spinner size="sm" /> : <Save size={16} />}
          Запис
        </button>
      </div>
    </div>
  )
}

function CompanyLogoSection({
  profileId,
  company,
  setError,
  setSuccess,
}: {
  profileId: string
  company: Company
  setError: (msg: string) => void
  setSuccess: (msg: string) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const showConfirm = useDialogStore((s) => s.showConfirm)

  const loadPreview = useCallback(async () => {
    try {
      const url = await companiesApi.fetchLogoBlobUrl(profileId, company.id)
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch {
      /* no logo yet */
    }
  }, [profileId, company.id])

  // State writes happen inside the async IIFE (microtask) to satisfy
  // react-hooks/set-state-in-effect.
  useEffect(() => {
    void (async () => {
      await loadPreview()
    })()
    return () => {
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [loadPreview])

  const onFile = async (file: File | null) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Файлът е над 2 MB')
      return
    }
    setBusy(true)
    try {
      await companiesApi.uploadLogo(profileId, company.id, file)
      await loadPreview()
      setSuccess('Логото е запазено')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при качване')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    const ok = await showConfirm({
      title: 'Премахване на лого',
      message: 'Сигурни ли сте?',
      confirmLabel: 'Премахни',
      cancelLabel: 'Откажи',
    })
    if (!ok) return
    setBusy(true)
    try {
      await companiesApi.deleteLogo(profileId, company.id)
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setSuccess('Логото е премахнато')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при изтриване')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Лого</h3>
      <div className="flex items-center gap-4">
        <div className="w-32 h-32 flex items-center justify-center border border-dashed border-gray-300 rounded-md bg-gray-50 overflow-hidden">
          {preview ? (
            <img src={preview} alt="Лого" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">без лого</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer disabled:opacity-50">
            <Upload size={14} />
            Качи лого
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              disabled={busy}
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {preview && (
            <button
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Премахни
            </button>
          )}
          <p className="text-xs text-gray-500">PNG, JPG, GIF или WEBP, до 2 MB.</p>
        </div>
      </div>
    </div>
  )
}

function BankAccountsSection({
  profileId,
  companyId,
  setError,
  setSuccess,
}: {
  profileId: string
  companyId: string
  setError: (msg: string) => void
  setSuccess: (msg: string) => void
}) {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<BankAccountPayload>({ iban: '', bank_name: '', bic: '', currency: 'BGN', is_default: false })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const showConfirm = useDialogStore((s) => s.showConfirm)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await bankAccountsApi.list(profileId, companyId)
      setAccounts(list)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане на банкови сметки')
    } finally {
      setLoading(false)
    }
  }, [profileId, companyId, setError])

  // State writes happen inside the async IIFE (microtask) to satisfy
  // react-hooks/set-state-in-effect.
  useEffect(() => {
    void (async () => { await reload() })()
  }, [reload])

  const resetForm = () => {
    setForm({ iban: '', bank_name: '', bic: '', currency: 'BGN', is_default: false })
    setEditingId(null)
  }

  const submit = async () => {
    if (!form.iban.trim()) {
      setError('IBAN е задължителен')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await bankAccountsApi.update(profileId, companyId, editingId, form)
        setSuccess('Банковата сметка е обновена')
      } else {
        await bankAccountsApi.create(profileId, companyId, form)
        setSuccess('Банковата сметка е добавена')
      }
      resetForm()
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при запис')
    } finally {
      setSaving(false)
    }
  }

  const edit = (a: BankAccount) => {
    setEditingId(a.id)
    setForm({
      iban: a.iban,
      bank_name: a.bank_name,
      bic: a.bic,
      currency: a.currency,
      is_default: a.is_default,
    })
  }

  const remove = async (a: BankAccount) => {
    const ok = await showConfirm({
      title: 'Изтриване на сметка',
      message: `Изтриване на ${a.iban}?`,
      confirmLabel: 'Изтрий',
      cancelLabel: 'Откажи',
    })
    if (!ok) return
    try {
      await bankAccountsApi.remove(profileId, companyId, a.id)
      setSuccess('Сметката е изтрита')
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при изтриване')
    }
  }

  const makeDefault = async (a: BankAccount) => {
    try {
      await bankAccountsApi.update(profileId, companyId, a.id, { is_default: true })
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Банкови сметки</h3>

      {loading ? (
        <Spinner />
      ) : accounts.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">Няма добавени банкови сметки.</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-md mb-4">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-900 truncate">{a.iban}</span>
                  {a.is_default && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      <Star size={12} /> по подразбиране
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">
                  {a.bank_name || '—'} · {a.bic || '—'} · {a.currency}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!a.is_default && (
                  <button
                    onClick={() => makeDefault(a)}
                    title="Направи по подразбиране"
                    className="p-2 text-gray-400 hover:text-amber-600"
                  >
                    <StarOff size={16} />
                  </button>
                )}
                <button onClick={() => edit(a)} className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded">
                  Редактирай
                </button>
                <button onClick={() => remove(a)} className="p-2 text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {editingId ? 'Редакция на сметка' : 'Нова сметка'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="IBAN">
            <TextInput value={form.iban} onChange={(v) => setForm((p) => ({ ...p, iban: v }))} placeholder="BG..." />
          </Field>
          <Field label="Банка">
            <TextInput value={form.bank_name ?? ''} onChange={(v) => setForm((p) => ({ ...p, bank_name: v }))} />
          </Field>
          <Field label="BIC">
            <TextInput value={form.bic ?? ''} onChange={(v) => setForm((p) => ({ ...p, bic: v }))} />
          </Field>
          <Field label="Валута">
            <select
              value={form.currency}
              onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="BGN">BGN</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
            <input
              type="checkbox"
              checked={!!form.is_default}
              onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
            />
            По подразбиране за тази фирма
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Spinner size="sm" /> : editingId ? <Save size={16} /> : <Plus size={16} />}
            {editingId ? 'Запази промените' : 'Добави'}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Откажи
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Sync tab ─────────────────────────── */

function SyncTab() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const setError = useUiStore((s) => s.setError)
  const setSuccess = useUiStore((s) => s.setSuccess)

  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [settings, setSettings] = useState<SyncSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profileId) return
    let cancelled = false
    ;(async () => {
      try {
        const list = await companiesApi.list(profileId)
        if (cancelled) return
        setCompanies(list)
        if (list.length && !selectedId) setSelectedId(list[0].id)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Грешка при зареждане')
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  useEffect(() => {
    if (!selectedId || !profileId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const s = await invoicingApi.getSyncSettings(selectedId, profileId)
        if (!cancelled) setSettings(s)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Грешка')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedId, profileId, setError])

  const save = async () => {
    if (!settings || !selectedId) return
    setSaving(true)
    try {
      const updated = await invoicingApi.updateSyncSettings(selectedId, profileId, settings)
      setSettings(updated)
      setSuccess('Настройките за синхронизация са запазени')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при запис')
    } finally {
      setSaving(false)
    }
  }

  if (!companies.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5">
        <p className="text-sm text-gray-600">Нямате регистрирана фирма.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Фирма</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.eik})</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Автоматично копиране към контрагент</h3>
        <p className="text-sm text-gray-600 mb-4">
          Когато издадете фактура към фирма, която е регистрирана в MegaBanx, системата може автоматично да създаде огледален запис в техния профил (чакащ одобрение).
        </p>

        {loading || !settings ? (
          <Spinner />
        ) : (
          <>
            <div className="space-y-2">
              <RadioRow
                name="sync_mode"
                checked={settings.sync_mode === 'immediate'}
                onChange={() => setSettings({ ...settings, sync_mode: 'immediate' })}
                title="Веднага"
                desc="Записът се появява при контрагента веднага след издаване на фактурата."
              />
              <RadioRow
                name="sync_mode"
                checked={settings.sync_mode === 'delayed'}
                onChange={() => setSettings({ ...settings, sync_mode: 'delayed' })}
                title="С отлагане"
                desc="Записът се появява при контрагента след избрания брой минути (позволява редакция преди изпращане)."
              />
              {settings.sync_mode === 'delayed' && (
                <div className="ml-7 flex items-center gap-2 text-sm">
                  <span className="text-gray-700">Отложи с</span>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={settings.delay_minutes}
                    onChange={(e) => setSettings({ ...settings, delay_minutes: parseInt(e.target.value || '0', 10) })}
                    className="w-24 px-2 py-1 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">минути</span>
                </div>
              )}
              <RadioRow
                name="sync_mode"
                checked={settings.sync_mode === 'manual'}
                onChange={() => setSettings({ ...settings, sync_mode: 'manual' })}
                title="Ръчно"
                desc="Няма автоматично копиране. Трябва ръчно да изпратите записа при контрагента."
              />
            </div>

            <div className="mt-4">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Spinner size="sm" /> : <Save size={16} />}
                Запис
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function InvoiceTemplateSection({
  profileId,
  company,
  onSaved,
  setError,
  setSuccess,
}: {
  profileId: string
  company: Company
  onSaved: (c: Company) => void
  setError: (msg: string) => void
  setSuccess: (msg: string) => void
}) {
  const [variants, setVariants] = useState<InvoiceTemplateVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string>(company.invoice_template ?? 'modern')
  const [saving, setSaving] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [openPreview, setOpenPreview] = useState<string | null>(null)
  // Mirror of previewUrls used for cleanup on unmount only — keeping this in
  // a ref avoids the cleanup running every time previewUrls changes (which
  // would prematurely revoke cached blob URLs).
  const previewUrlsRef = useRef<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (cancelled) return
      try {
        const res = await invoiceTemplatesApi.list()
        if (!cancelled) setVariants(res.templates)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Грешка при зареждане на шаблоните')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [setError])

  useEffect(() => {
    previewUrlsRef.current = previewUrls
  }, [previewUrls])

  // Revoke all blob URLs only on unmount.
  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((u) => {
        try { URL.revokeObjectURL(u) } catch { /* ignore */ }
      })
    }
  }, [])

  const showPreview = useCallback(async (key: string) => {
    setOpenPreview(key)
    if (previewUrlsRef.current[key]) return
    try {
      const url = await invoiceTemplatesApi.previewUrl(key)
      setPreviewUrls((prev) => ({ ...prev, [key]: url }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане на преглед')
    }
  }, [setError])

  const save = async () => {
    setSaving(true)
    try {
      const updated = await companiesApi.update(profileId, company.id, { invoice_template: selected })
      onSaved(updated)
      setSuccess('Шаблонът е запазен')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при запазване')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-900">Шаблон на фактура</h3>
      </div>
      <p className="text-xs text-gray-600 mb-4">
        Изберете визуален шаблон, който ще се използва при генериране на PDF на фактурите за тази фирма. Можете да го презапишете за конкретна фактура при издаване.
      </p>

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {variants.map((v) => {
            const isSelected = selected === v.key
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setSelected(v.key)}
                className={`text-left rounded-lg border-2 p-3 transition ${
                  isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">{v.name}</div>
                  {isSelected && <Check size={16} className="text-indigo-600" />}
                </div>
                <div className="text-xs text-gray-600 mt-1 mb-2">{v.description}</div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); void showPreview(v.key) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      e.preventDefault()
                      void showPreview(v.key)
                    }
                  }}
                  className="mt-2 w-full text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                >
                  👁 Преглед
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          <Save size={14} />{saving ? 'Запазване…' : 'Запази шаблон'}
        </button>
      </div>

      {openPreview && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setOpenPreview(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <h4 className="text-sm font-semibold">Преглед: {variants.find((v) => v.key === openPreview)?.name}</h4>
              <button onClick={() => setOpenPreview(null)} className="text-gray-500 hover:text-gray-900">✕</button>
            </div>
            <div className="flex-1 overflow-hidden">
              {previewUrls[openPreview] ? (
                <iframe
                  key={openPreview}
                  title="template-preview"
                  src={previewUrls[openPreview]}
                  className="w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full"><Spinner /></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function RadioRow({
  name, checked, onChange, title, desc,
}: {
  name: string
  checked: boolean
  onChange: () => void
  title: string
  desc: string
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-md border border-gray-100 hover:bg-gray-50 cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1" />
      <div>
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <div className="text-xs text-gray-600">{desc}</div>
      </div>
    </label>
  )
}

/* ─────────────────────────── Shared UI helpers ─────────────────────────── */

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  )
}
