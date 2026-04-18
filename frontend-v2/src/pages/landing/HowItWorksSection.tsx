import { FileUp, Brain, UserCheck, CalendarCheck, ArrowRight } from 'lucide-react'

const steps = [
  {
    icon: FileUp,
    title: 'Издаване или качване',
    description: 'Издайте нова фактура директно в MegaBanx или качете получена фактура като PDF файл.',
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    num: '01',
  },
  {
    icon: Brain,
    title: 'AI разпознаване',
    description: 'Нашият изкуствен интелект автоматично извлича данните — номер, дата, контрагент, сума, ДДС.',
    gradient: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50',
    num: '02',
  },
  {
    icon: UserCheck,
    title: 'Клиентът одобрява',
    description: 'Издадената фактура се изпраща автоматично на контрагента. Ако е в MegaBanx — директно в профила му.',
    gradient: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50',
    num: '03',
  },
  {
    icon: CalendarCheck,
    title: 'Счетоводителят тегли',
    description: 'Счетоводителят свaля фактурите групово, вече подредени по фирми и типове — Покупки и Продажби.',
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    num: '04',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how" className="py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <ArrowRight className="w-4 h-4" /> Как работи
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Как работи MegaBanx</h2>
          <p className="text-gray-500 max-w-xl mx-auto">От издаване до доставка — целият процес е автоматизиран</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, description, gradient, bg, num }) => (
            <div key={num} className={`${bg} rounded-2xl p-6 relative overflow-hidden group hover:shadow-lg transition-shadow`}>
              <div className="absolute top-4 right-4 text-4xl font-extrabold opacity-10 text-gray-900">{num}</div>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
