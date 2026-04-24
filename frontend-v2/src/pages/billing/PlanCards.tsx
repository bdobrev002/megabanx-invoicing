import { useState } from 'react'
import { Check, Star, Zap, Users, Crown, Loader2 } from 'lucide-react'
import { billingApi } from '@/api/billing.api'
import { useBillingStore } from '@/stores/billingStore'
import { useUiStore } from '@/stores/uiStore'
import type { BillingPlan } from '@/types/billing.types'
import VatConfirmDialog from './VatConfirmDialog'

interface Props {
  currentPlan?: string
  /** Whether the current Stripe subscription is active (blocks trial activation). */
  hasStripeSubscription?: boolean
}

function planColors(plan: BillingPlan): string {
  if (plan.id === 'business') return 'border-indigo-400 bg-indigo-50'
  if (plan.id === 'corporate') return 'border-yellow-400 bg-yellow-50'
  if (plan.id === 'personal') return 'border-purple-400 bg-purple-50'
  if (plan.promo) return 'border-orange-400 bg-orange-50'
  if (plan.id === 'free') return 'border-gray-200 bg-gray-50'
  return 'border-gray-300 bg-white'
}

function iconCircleClass(plan: BillingPlan): string {
  if (plan.id === 'free') return 'bg-gray-200'
  if (plan.id === 'starter') return 'bg-blue-100'
  if (plan.id === 'pro') return 'bg-indigo-100'
  if (plan.id === 'business') return 'bg-indigo-200'
  if (plan.id === 'corporate') return 'bg-yellow-200'
  if (plan.id === 'personal') return 'bg-purple-200'
  return 'bg-gray-100'
}

function PlanIcon({ plan }: { plan: BillingPlan }) {
  if (plan.id === 'free') return <Users className="h-5 w-5 text-gray-500" />
  if (plan.id === 'starter') return <Zap className="h-5 w-5 text-blue-600" />
  if (plan.id === 'pro') return <Star className="h-5 w-5 text-indigo-600" />
  if (plan.id === 'business') return <Zap className="h-5 w-5 text-indigo-700" />
  if (plan.id === 'corporate') return <Star className="h-5 w-5 text-yellow-700" />
  return <Crown className="h-5 w-5 text-purple-700" />
}

function ctaButtonClass(plan: BillingPlan): string {
  if (plan.contact_us) return 'bg-purple-600 text-white hover:bg-purple-700'
  if (plan.id === 'free') return 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  if (plan.id === 'business') return 'bg-indigo-600 text-white hover:bg-indigo-700'
  if (plan.id === 'corporate') return 'bg-yellow-500 text-white hover:bg-yellow-600'
  return 'bg-gray-900 text-white hover:bg-gray-800'
}

export default function PlanCards({ currentPlan, hasStripeSubscription }: Props) {
  const plans = useBillingStore((s) => s.plans)
  const setError = useUiStore((s) => s.setError)
  const [selected, setSelected] = useState<{ id: string; interval: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const handleSubscribe = async (planId: string, interval: string) => {
    setBusy(planId)
    try {
      const { checkout_url } = await billingApi.subscribe(planId, interval)
      window.location.href = checkout_url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при абониране')
      setBusy(null)
    }
  }

  const handleStartTrial = async (planId: string) => {
    setBusy(planId)
    try {
      await billingApi.activateTrial(planId)
      window.location.reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при активиране на пробен период')
      setBusy(null)
    }
  }

  return (
    <>
      <h3 className="mb-3 text-sm font-medium text-gray-700">Налични планове</h3>
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = !!currentPlan && plan.id === currentPlan
          const interval = plan.interval ?? 'monthly'
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 p-4 transition ${planColors(plan)}`}
            >
              {plan.popular && (
                <div className="absolute left-1/2 -top-3 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-medium text-white">
                  Популярен
                </div>
              )}
              {plan.id === 'corporate' && !plan.popular && (
                <div className="absolute left-1/2 -top-3 -translate-x-1/2 rounded-full bg-yellow-500 px-3 py-0.5 text-xs font-medium text-white">
                  Корпоративен
                </div>
              )}
              {plan.promo && (
                <div className="absolute -top-1 -right-1 z-10 rounded-bl-xl rounded-tr-xl bg-gradient-to-r from-orange-500 to-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
                  {plan.promo}
                </div>
              )}

              <div className="mb-4 text-center">
                <div
                  className={`mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full ${iconCircleClass(plan)}`}
                >
                  <PlanIcon plan={plan} />
                </div>
                <h4 className="text-lg font-bold">{plan.name}</h4>
                <div className="mt-1">
                  {plan.contact_us ? (
                    <>
                      <div className="text-lg font-extrabold text-gray-900">По договаряне</div>
                      <p className="text-xs text-gray-400">свържете се с нас</p>
                    </>
                  ) : plan.price === 0 ? (
                    <>
                      <div className="text-2xl font-extrabold text-gray-900">0 EUR</div>
                      <p className="text-xs text-gray-400">завинаги</p>
                    </>
                  ) : (
                    <div>
                      <span className="text-2xl font-extrabold text-gray-900">
                        {plan.price.toFixed(2)}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">
                        EUR/{plan.interval === 'year' ? 'год' : 'мес'}
                      </span>
                      {plan.savings && (
                        <p className="mt-0.5 text-xs font-medium text-green-600">{plan.savings}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <ul className="mb-4 flex-1 space-y-1.5">
                {plan.features.map((f, i) => (
                  <li
                    key={`${plan.id}-f-${i}`}
                    className="flex items-center gap-2 text-xs text-gray-600"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-500" /> {f}
                  </li>
                ))}
              </ul>

              {plan.contact_us ? (
                <a
                  href="mailto:support@megabanx.com"
                  className={`mt-auto block w-full rounded-xl py-2 text-center text-sm font-medium transition ${ctaButtonClass(plan)}`}
                >
                  Свържете се с нас
                </a>
              ) : isCurrent ? (
                <div className="mt-auto w-full cursor-default rounded-xl bg-green-100 py-2 text-center text-sm font-medium text-green-700">
                  Текущ план
                </div>
              ) : plan.id === 'free' ? (
                <div className="mt-auto w-full cursor-default rounded-xl bg-gray-200 py-2 text-center text-sm font-medium text-gray-700">
                  Безплатен
                </div>
              ) : (plan.id === 'starter' || plan.id === 'pro') && !hasStripeSubscription ? (
                <button
                  type="button"
                  onClick={() => handleStartTrial(plan.id)}
                  disabled={busy !== null}
                  className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition disabled:opacity-60 ${ctaButtonClass(plan)}`}
                >
                  {busy === plan.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Започни пробен период
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelected({ id: plan.id, interval })}
                  disabled={busy !== null}
                  className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition disabled:opacity-60 ${ctaButtonClass(plan)}`}
                >
                  {busy === plan.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Абонирай се
                </button>
              )}
            </div>
          )
        })}
      </div>

      {selected && (
        <VatConfirmDialog
          open
          onClose={() => setSelected(null)}
          onConfirm={() => {
            handleSubscribe(selected.id, selected.interval)
            setSelected(null)
          }}
        />
      )}
    </>
  )
}
