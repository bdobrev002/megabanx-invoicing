import { useState, useEffect, useCallback } from 'react'
import Spinner from '@/components/ui/Spinner'
import { billingApi } from '@/api/billing.api'
import { useBillingStore } from '@/stores/billingStore'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import SubscriptionStatus from './SubscriptionStatus'
import PlanCards from './PlanCards'
import TrialActivation from './TrialActivation'
import PaymentHistory from './PaymentHistory'

export default function BillingPage() {
  const { setPlans, setPayments } = useBillingStore()
  const subscription = useAuthStore((s) => s.user?.subscription) ?? null
  const setError = useUiStore((s) => s.setError)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [plans, payments] = await Promise.all([
        billingApi.getPlans(),
        billingApi.getPaymentHistory(),
      ])
      setPlans(plans)
      setPayments(payments)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане')
    } finally {
      setLoading(false)
    }
  }, [setPlans, setPayments, setError])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner /></div>
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Абонамент</h1>

      {subscription && <SubscriptionStatus subscription={subscription} />}

      {subscription?.status === 'trial' && <TrialActivation />}

      <PlanCards currentPlan={subscription?.plan} />

      <PaymentHistory />
    </div>
  )
}
