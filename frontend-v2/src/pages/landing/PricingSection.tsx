import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Loader2, Star, CheckCircle, MessageSquare } from 'lucide-react'
import { ROUTES } from '@/utils/constants'
import { apiFetch } from '@/api/client'

interface BillingPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  currency: string
  max_companies: number
  max_invoices: number
  features: string[]
  is_popular?: boolean
  is_contact_us?: boolean
}

export default function PricingSection() {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<BillingPlan[]>('/billing/plans')
      .then(setPlans)
      .catch(() => {
        // Fallback static plans if API fails
        setPlans([
          { id: 'free', name: 'Безплатен', description: 'За индивидуални потребители', price_monthly: 0, price_yearly: 0, currency: 'BGN', max_companies: 3, max_invoices: 50, features: ['До 3 фирми', 'До 50 фактури/месец', 'AI обработка', 'Автоматично споделяне'] },
          { id: 'pro', name: 'Професионален', description: 'За малки и средни фирми', price_monthly: 29.99, price_yearly: 299.99, currency: 'BGN', max_companies: 10, max_invoices: 500, features: ['До 10 фирми', 'До 500 фактури/месец', 'Всичко от Безплатен', 'Издаване на фактури', 'Приоритетна поддръжка'], is_popular: true },
          { id: 'business', name: 'Бизнес', description: 'За големи компании', price_monthly: 0, price_yearly: 0, currency: 'BGN', max_companies: 999999, max_invoices: 999999, features: ['Неограничени фирми', 'Неограничени фактури', 'Всичко от Професионален', 'API достъп', 'Персонален мениджър'], is_contact_us: true },
        ])
      })
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
          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl bg-white p-8 relative ${
                  plan.is_popular
                    ? 'border-2 border-indigo-600 ring-4 ring-indigo-100 shadow-xl'
                    : 'border border-gray-200 shadow-sm'
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-1 text-xs font-bold text-white shadow-lg">
                      <Star className="w-3 h-3" /> Най-популярен
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

                <div className="mt-6">
                  {plan.is_contact_us ? (
                    <div className="text-2xl font-bold text-gray-900">По запитване</div>
                  ) : plan.price_monthly === 0 ? (
                    <div>
                      <span className="text-4xl font-extrabold text-gray-900">Безплатно</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-4xl font-extrabold text-gray-900">{plan.price_monthly.toFixed(2)}</span>
                      <span className="text-gray-500 ml-1">лв/мес</span>
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

                {plan.is_contact_us ? (
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
                      plan.is_popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {plan.price_monthly === 0 ? 'Започни безплатно' : 'Избери план'}
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
