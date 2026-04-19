import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Check } from 'lucide-react'
import { billingApi } from '@/api/billing.api'
import { useBillingStore } from '@/stores/billingStore'
import { useUiStore } from '@/stores/uiStore'
import VatConfirmDialog from './VatConfirmDialog'

interface Props {
  currentPlan?: string
}

export default function PlanCards({ currentPlan }: Props) {
  const plans = useBillingStore((s) => s.plans)
  const setError = useUiStore((s) => s.setError)
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; interval: string } | null>(null)

  const handleSubscribe = async (planId: string, interval: string) => {
    try {
      const { checkout_url } = await billingApi.subscribe(planId, interval)
      window.location.href = checkout_url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при абониране')
    }
  }

  return (
    <>
      <h2 className="mb-4 mt-8 text-lg font-semibold text-gray-900">Планове</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlan
          return (
            <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-indigo-500' : ''}`}>
              {plan.popular && (
                <Badge variant="info" className="absolute -top-2 right-4">Популярен</Badge>
              )}
              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              {!plan.contact_us ? (
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {plan.price} {plan.currency}
                  <span className="text-sm font-normal text-gray-500">/{plan.interval ?? 'мес.'}</span>
                </p>
              ) : (
                <p className="mt-1 text-lg font-semibold text-indigo-600">Свържете се с нас</p>
              )}
              {plan.promo && <p className="mt-1 text-sm text-green-600">{plan.promo}</p>}
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={14} className="mt-0.5 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              {!plan.contact_us && !isCurrent && (
                <Button
                  className="mt-4 w-full"
                  onClick={() => setSelectedPlan({ id: plan.id, interval: plan.interval ?? 'monthly' })}
                >
                  Избери
                </Button>
              )}
              {isCurrent && (
                <Badge variant="success" className="mt-4">Текущ план</Badge>
              )}
            </Card>
          )
        })}
      </div>

      {selectedPlan && (
        <VatConfirmDialog
          open
          onClose={() => setSelectedPlan(null)}
          onConfirm={() => {
            handleSubscribe(selectedPlan.id, selectedPlan.interval)
            setSelectedPlan(null)
          }}
        />
      )}
    </>
  )
}
