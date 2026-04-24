import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Star, Check, Zap, Users, Crown } from 'lucide-react'
import { ROUTES } from '@/utils/constants'
import { apiFetch } from '@/api/client'

interface BillingPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: string | null
  max_companies: number
  max_invoices: number
  features: string[]
  popular?: boolean
  contact_us?: boolean
  promo?: string
  trial_days?: number
}

interface PlansResponse {
  plans: BillingPlan[]
}

const FALLBACK_PLANS: BillingPlan[] = [
  { id: 'free', name: 'Безплатен', price: 0, currency: 'EUR', interval: null, max_companies: 1, max_invoices: 10, features: ['1 фирма', 'До 10 фактури/мес', 'AI обработка', 'Имейл известия'] },
  { id: 'starter', name: 'Стартов', price: 29.99, currency: 'EUR', interval: 'month', max_companies: 3, max_invoices: 50, promo: '3 месеца БЕЗПЛАТНО', features: ['До 3 фирми', 'До 50 фактури/мес', 'AI обработка', 'Сваляне на фактури'] },
  { id: 'business', name: 'Бизнес', price: 99.99, currency: 'EUR', interval: 'month', max_companies: 5, max_invoices: 3500, popular: true, features: ['До 5 фирми', 'До 3 500 фактури/мес', 'AI обработка', 'Приоритетна поддръжка'] },
]

/** Per-plan border + background color classes */
function planColors(plan: BillingPlan) {
  if (plan.id === 'business') return 'border-indigo-400 bg-indigo-50'
  if (plan.id === 'corporate') return 'border-yellow-400 bg-yellow-50'
  if (plan.id === 'personal') return 'border-purple-400 bg-purple-50'
  if (plan.promo) return 'border-orange-400 bg-orange-50'
  if (plan.id === 'free') return 'border-gray-200 bg-gray-50'
  return 'border-gray-300 bg-white'
}

/** Per-plan icon circle background */
function iconCircleClass(plan: BillingPlan) {
  if (plan.id === 'free') return 'bg-gray-200'
  if (plan.id === 'starter') return 'bg-blue-100'
  if (plan.id === 'pro') return 'bg-indigo-100'
  if (plan.id === 'business') return 'bg-indigo-200'
  if (plan.id === 'corporate') return 'bg-yellow-200'
  if (plan.id === 'personal') return 'bg-purple-200'
  return 'bg-gray-100'
}

/** Per-plan icon */
function PlanIcon({ plan }: { plan: BillingPlan }) {
  if (plan.id === 'free') return <Users className="w-5 h-5 text-gray-500" />
  if (plan.id === 'starter') return <Zap className="w-5 h-5 text-blue-600" />
  if (plan.id === 'pro') return <Star className="w-5 h-5 text-indigo-600" />
  if (plan.id === 'business') return <Zap className="w-5 h-5 text-indigo-700" />
  if (plan.id === 'corporate') return <Star className="w-5 h-5 text-yellow-700" />
  return <Crown className="w-5 h-5 text-purple-700" />
}

/** Per-plan CTA button classes */
function buttonClass(plan: BillingPlan) {
  if (plan.contact_us) return 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200'
  if (plan.id === 'free') return 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  if (plan.id === 'business') return 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
  if (plan.id === 'corporate') return 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg shadow-yellow-200'
  return 'bg-gray-900 text-white hover:bg-gray-800'
}

export default function PricingSection() {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<PlansResponse>('/billing/plans')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.plans
        setPlans(Array.isArray(list) ? list : FALLBACK_PLANS)
      })
      .catch(() => setPlans(FALLBACK_PLANS))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section id="pricing" className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Планове и цени</h2>
          <p className="text-gray-500">Започнете безплатно, надградете когато сте готови</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border-2 p-5 flex flex-col relative ${planColors(plan)}`}
              >
                {/* Plan-specific badges */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">Популярен</div>
                )}
                {plan.id === 'corporate' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs px-3 py-0.5 rounded-full font-medium">Корпоративен</div>
                )}
                {plan.id === 'personal' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">Персонален</div>
                )}
                {plan.promo && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-xl rounded-tr-xl shadow-lg z-10 uppercase tracking-wide">
                    {plan.promo}
                  </div>
                )}

                {/* Icon + Name + Price */}
                <div className="text-center mb-5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${iconCircleClass(plan)}`}>
                    <PlanIcon plan={plan} />
                  </div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="mt-1">
                    {plan.contact_us ? (
                      <div className="text-2xl font-extrabold text-gray-900">По договаряне</div>
                    ) : plan.price === 0 ? (
                      <>
                        <div className="text-2xl font-extrabold text-gray-900">0 EUR</div>
                        <p className="text-xs text-gray-400">завинаги</p>
                      </>
                    ) : (
                      <div className="text-2xl font-extrabold text-gray-900">
                        {plan.price.toFixed(2)}{' '}
                        <span className="text-xs font-normal text-gray-400">
                          EUR/{plan.interval === 'month' ? 'мес' : 'год'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.features.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {plan.contact_us ? (
                  <Link
                    to={ROUTES.CONTACT}
                    className={`w-full py-2 rounded-xl text-sm font-medium text-center block transition mt-auto ${buttonClass(plan)}`}
                  >
                    Свържете се с нас
                  </Link>
                ) : plan.id === 'free' ? (
                  <Link
                    to={ROUTES.REGISTER}
                    className={`w-full py-2 rounded-xl text-sm font-medium text-center block transition mt-auto ${buttonClass(plan)}`}
                  >
                    Започнете безплатно
                  </Link>
                ) : (
                  <Link
                    to={ROUTES.REGISTER}
                    className={`w-full py-2 rounded-xl text-sm font-medium text-center block transition mt-auto ${buttonClass(plan)}`}
                  >
                    {plan.id === 'starter' || plan.id === 'pro'
                      ? 'Започни пробен период'
                      : 'Абонирай се'}
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">Не могат да се заредят плановете. Моля, опитайте отново.</div>
        )}
        <p className="text-center text-xs text-gray-400 mt-4">Всички цени са без ДДС (20%)</p>
      </div>
    </section>
  )
}
