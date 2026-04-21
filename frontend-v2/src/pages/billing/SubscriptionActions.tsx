import Button from '@/components/ui/Button'
import { billingApi } from '@/api/billing.api'
import { useUiStore } from '@/stores/uiStore'
import type { SubscriptionInfo } from '@/types/auth.types'

interface Props {
  subscription: SubscriptionInfo
}

export default function SubscriptionActions({ subscription }: Props) {
  const setError = useUiStore((s) => s.setError)

  const handleCancel = async () => {
    try {
      await billingApi.cancelSubscription()
      window.location.reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при отмяна')
    }
  }

  const handleResume = async () => {
    try {
      await billingApi.resumeSubscription()
      window.location.reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при възстановяване')
    }
  }

  if (subscription.cancel_at_period_end) {
    return (
      <Button size="sm" onClick={handleResume}>
        Възстанови абонамент
      </Button>
    )
  }

  if (subscription.status === 'active') {
    return (
      <Button size="sm" variant="danger" onClick={handleCancel}>
        Отмени абонамент
      </Button>
    )
  }

  return null
}
