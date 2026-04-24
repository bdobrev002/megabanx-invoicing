import { useCallback, useEffect, useState } from 'react'
import { CreditCard, History, LayoutGrid } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import { billingApi } from '@/api/billing.api'
import { authApi } from '@/api/auth.api'
import { useBillingStore } from '@/stores/billingStore'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import SubscriptionStatus from './SubscriptionStatus'
import PlanCards from './PlanCards'
import TrialActivation from './TrialActivation'
import PaymentHistory from './PaymentHistory'

type Tab = 'plans' | 'payments'

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'plans', label: 'Планове', icon: LayoutGrid },
  { key: 'payments', label: 'История на плащанията', icon: History },
]

export default function BillingPage() {
  const { setPlans, setPayments } = useBillingStore()
  const subscription = useAuthStore((s) => s.user?.subscription) ?? null
  const setUser = useAuthStore((s) => s.setUser)
  const setError = useUiStore((s) => s.setError)
  const setSuccess = useUiStore((s) => s.setSuccess)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('plans')

  const fetchData = useCallback(async () => {
    try {
      const [plans, payments] = await Promise.all([
        billingApi.getPlans(),
        billingApi.getPaymentHistory().catch(() => []),
      ])
      setPlans(plans)
      setPayments(payments)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане')
    } finally {
      setLoading(false)
    }
  }, [setPlans, setPayments, setError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Stage 9: when Stripe redirects us back with ?billing=success, refresh the
  // user (subscription fields flip after webhook persists) and show a toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const flag = params.get('billing')
    if (!flag) return
    if (flag === 'success') {
      setSuccess?.('Благодарим! Абонаментът ви е активен.')
      authApi.me().then((u) => setUser(u)).catch(() => {})
      billingApi.getPaymentHistory().then(setPayments).catch(() => {})
    } else if (flag === 'cancel') {
      setError('Плащането беше отказано.')
    }
    params.delete('billing')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [setUser, setPayments, setSuccess, setError])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
        <CreditCard className="h-6 w-6 text-indigo-600" /> Абонамент
      </h1>

      {subscription && <SubscriptionStatus subscription={subscription} />}

      {/* TrialActivation is only for the non-Stripe 30-day trial. If the user
          is already on a Stripe-managed trial (stripe_subscription_id set),
          they have a real subscription and /trial would 400. */}
      {subscription?.status === 'trial' && !subscription?.stripe_subscription_id && <TrialActivation />}

      <div className="mb-4 flex gap-1 border-b">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ' +
                (active
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700')
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          )
        })}
      </div>

      {tab === 'plans' && (
        <PlanCards
          currentPlan={subscription?.plan}
          hasStripeSubscription={!!subscription?.stripe_subscription_id}
        />
      )}
      {tab === 'payments' && <PaymentHistory />}
    </div>
  )
}
