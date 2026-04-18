import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Loader2, Star, CheckCircle, MessageSquare } from 'lucide-react'
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
    <section id="pricing" className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <CreditCard className="w-4 h-4" /> Планове и цени
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Планове и цени</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Изберете план, който отговаря на вашите нужди. Започнете безплатно!</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl bg-white p-8 relative ${
                  plan.popular
                    ? 'border-2 border-indigo-600 ring-4 ring-indigo-100 shadow-xl'
                    : 'border border-gray-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-1 text-xs font-bold text-white shadow-lg">
                      <Star className="w-3 h-3" /> Най-популярен
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                {plan.promo && (
                  <span className="inline-block mt-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{plan.promo}</span>
                )}

                <div className="mt-6">
                  {plan.contact_us ? (
                    <div className="text-2xl font-bold text-gray-900">По запитване</div>
                  ) : plan.price === 0 ? (
                    <div>
                      <span className="text-4xl font-extrabold text-gray-900">Безплатно</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-4xl font-extrabold text-gray-900">{plan.price.toFixed(2)}</span>
                      <span className="text-gray-500 ml-1">{plan.currency}/{plan.interval === 'month' ? 'мес' : 'год'}</span>
                    </div>
                  )}
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {plan.contact_us ? (
                  <Link
                    to={ROUTES.CONTACT}
                    className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <MessageSquare className="w-4 h-4" /> Свържете се с нас
                  </Link>
                ) : (
                  <Link
                    to={ROUTES.REGISTER}
                    className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition ${
                      plan.popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {plan.price === 0 ? 'Започни безплатно' : 'Избери план'}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
