import { Shield, Lock, Server } from 'lucide-react'

const features = [
  { icon: Shield, title: 'Криптирани данни', description: 'Всички данни се криптират при пренос и съхранение.' },
  { icon: Lock, title: 'Двуфакторна автентикация', description: 'Допълнителна защита за вашия акаунт.' },
  { icon: Server, title: 'Европейски сървъри', description: 'Данните ви се съхраняват в EU, съгласно GDPR.' },
]

export default function SecuritySection() {
  return (
    <section id="security" className="py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Сигурност</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
              <Icon size={28} className="text-blue-600" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
