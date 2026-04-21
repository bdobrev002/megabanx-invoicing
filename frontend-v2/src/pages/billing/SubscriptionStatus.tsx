import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/utils/formatters'
import type { SubscriptionInfo } from '@/types/auth.types'
import SubscriptionActions from './SubscriptionActions'

interface Props {
  subscription: SubscriptionInfo
}

const statusLabel: Record<string, string> = {
  active: 'Активен',
  trial: 'Пробен период',
  canceled: 'Отменен',
  expired: 'Изтекъл',
  past_due: 'Просрочен',
}

const statusVariant = (s: string) => {
  if (s === 'active') return 'success' as const
  if (s === 'trial') return 'info' as const
  if (s === 'canceled' || s === 'expired') return 'danger' as const
  return 'warning' as const
}

export default function SubscriptionStatus({ subscription }: Props) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Текущ план: {subscription.plan}</h2>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={statusVariant(subscription.status)}>
              {statusLabel[subscription.status] ?? subscription.status}
            </Badge>
            {subscription.cancel_at_period_end && (
              <Badge variant="warning">Ще бъде отменен</Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Валиден до: {formatDate(subscription.expires)}
          </p>
          {subscription.usage && (
            <p className="mt-1 text-sm text-gray-500">
              Фирми: {subscription.usage.companies}/{subscription.max_companies} |
              Фактури: {subscription.usage.invoices}/{subscription.max_invoices}
            </p>
          )}
        </div>
        <SubscriptionActions subscription={subscription} />
      </div>
    </Card>
  )
}
