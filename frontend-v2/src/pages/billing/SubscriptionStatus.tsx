import { Crown, Shield, AlertTriangle, RefreshCw, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { billingApi } from '@/api/billing.api'
import { useUiStore } from '@/stores/uiStore'
import type { SubscriptionInfo } from '@/types/auth.types'

interface Props {
  subscription: SubscriptionInfo
}

const PLAN_NAME: Record<string, string> = {
  free: 'Безплатен план',
  starter: 'Стартов',
  pro: 'Професионален',
  business: 'Бизнес',
  corporate: 'Корпоративен',
  personal: 'Персонален',
}

function formatDateBG(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('bg-BG')
  } catch {
    return ''
  }
}

function bannerColors(status: string): { wrap: string; label: string } {
  switch (status) {
    case 'active':
      return { wrap: 'bg-green-50 border-green-200', label: 'text-green-700' }
    case 'trial':
      return { wrap: 'bg-blue-50 border-blue-200', label: 'text-blue-700' }
    case 'expired':
    case 'cancelled':
    case 'canceled':
    case 'past_due':
      return { wrap: 'bg-orange-50 border-orange-200', label: 'text-orange-700' }
    default:
      return { wrap: 'bg-gray-50 border-gray-200', label: 'text-gray-700' }
  }
}

function StatusLabel({ status }: { status: string }) {
  const { label } = bannerColors(status)
  const text =
    status === 'active'
      ? 'Активен абонамент'
      : status === 'trial'
        ? 'Пробен период'
        : status === 'expired'
          ? 'Изтекъл абонамент'
          : status === 'cancelled' || status === 'canceled'
            ? 'Отменен абонамент'
            : status === 'past_due'
              ? 'Просрочен абонамент'
              : 'Безплатен план'
  return <span className={`text-sm font-medium ${label}`}>{text}</span>
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'active') return <Crown className="h-6 w-6 text-yellow-500" />
  if (status === 'trial') return <Shield className="h-6 w-6 text-blue-500" />
  if (status === 'expired' || status === 'cancelled' || status === 'canceled' || status === 'past_due')
    return <AlertTriangle className="h-6 w-6 text-orange-500" />
  return <Crown className="h-6 w-6 text-gray-400" />
}

export default function SubscriptionStatus({ subscription }: Props) {
  const setError = useUiStore((s) => s.setError)
  const [busy, setBusy] = useState<'cancel' | 'resume' | 'portal' | null>(null)
  const colors = bannerColors(subscription.status)
  const planLabel = PLAN_NAME[subscription.plan] ?? subscription.plan
  const hasUsage = !!subscription.usage
  const maxCompanies =
    subscription.max_companies >= 999999 ? '∞' : String(subscription.max_companies)
  const maxInvoices =
    subscription.max_invoices >= 999999 ? '∞' : String(subscription.max_invoices)

  const run = async (kind: 'cancel' | 'resume' | 'portal', fn: () => Promise<unknown>) => {
    setBusy(kind)
    try {
      await fn()
      if (kind !== 'portal') window.location.reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка')
    } finally {
      setBusy(null)
    }
  }

  const openPortal = async () => {
    setBusy('portal')
    try {
      const { url } = await billingApi.openPortal()
      window.location.href = url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при отваряне на портала')
      setBusy(null)
    }
  }

  return (
    <div className={`mb-6 rounded-xl border p-4 ${colors.wrap}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <StatusLabel status={subscription.status} />
          <div className="mt-1 text-xs text-gray-500">
            {subscription.plan && subscription.plan !== 'free' ? `План: ${planLabel}` : planLabel}
            {subscription.expires && ` · Валиден до: ${formatDateBG(subscription.expires)}`}
          </div>
          {subscription.cancel_at_period_end && (
            <div className="mt-1 text-xs font-medium text-orange-600">
              Автоматичното подновяване е спряно
            </div>
          )}
        </div>
        <div className="shrink-0">
          <StatusIcon status={subscription.status} />
        </div>
      </div>

      {hasUsage && subscription.usage && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <div className="text-xs text-gray-500">Фирми</div>
            <div className="text-sm font-bold">
              {subscription.usage.companies} / {maxCompanies}
            </div>
          </div>
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <div className="text-xs text-gray-500">Фактури</div>
            <div className="text-sm font-bold">
              {subscription.usage.invoices} / {maxInvoices}
            </div>
          </div>
        </div>
      )}

      {(subscription.status === 'active' || subscription.status === 'trial') && subscription.stripe_subscription_id && (
        <div className="mt-3 flex flex-wrap gap-2">
          {subscription.cancel_at_period_end ? (
            <button
              type="button"
              onClick={() => run('resume', billingApi.resumeSubscription)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-600 transition hover:bg-green-100 disabled:opacity-60"
            >
              {busy === 'resume' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Възстанови автоматично подновяване
            </button>
          ) : (
            <button
              type="button"
              onClick={() => run('cancel', billingApi.cancelSubscription)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-100 disabled:opacity-60"
            >
              {busy === 'cancel' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              Спри автоматично подновяване
            </button>
          )}
          <button
            type="button"
            onClick={openPortal}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-60"
          >
            {busy === 'portal' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ExternalLink className="h-3 w-3" />
            )}
            Управление на плащанията
          </button>
        </div>
      )}
    </div>
  )
}
