import { Link } from 'react-router-dom'
import { ROUTES } from '@/utils/constants'

const plans = [
  { name: 'Безплатен', price: '0', features: ['1 фирма', '10 фактури/мес', 'Основни функции'], cta: 'Започни безплатно' },
  { name: 'Про', price: '19.99', features: ['5 фирми', '100 фактури/мес', 'Фактуриране модул', 'Приоритетна поддръжка'], cta: 'Избери Про', popular: true },
  { name: 'Бизнес', price: '49.99', features: ['Неограничени фирми', 'Неограничени фактури', 'API достъп', 'Персонален мениджър'], cta: 'Свържи се' },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Цени</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-gray-600">
          Изберете план, който отговаря на вашите нужди.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border bg-white p-8 ${plan.popular ? 'border-indigo-600 ring-2 ring-indigo-600' : 'border-gray-200'}`}
            >
              {plan.popular && (
                <span className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Най-популярен
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                <span className="text-gray-500"> лв/мес</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-indigo-600">&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                to={ROUTES.REGISTER}
                className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold ${
                  plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
