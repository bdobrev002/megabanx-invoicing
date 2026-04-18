const faqs = [
  { q: 'Какви формати файлове се поддържат?', a: 'PDF файлове с фактури, проформи, кредитни и дебитни известия.' },
  { q: 'Колко фирми мога да добавя?', a: 'Зависи от плана ви — от 1 до неограничен брой фирми.' },
  { q: 'Данните ми сигурни ли са?', a: 'Да, използваме криптиране и съхраняваме данните в EU сървъри.' },
  { q: 'Мога ли да споделям фирма с колеги?', a: 'Да, можете да поканите колеги с различни нива на достъп.' },
  { q: 'Как работи фактурирането?', a: 'Създавате фактури директно в платформата и ги изпращате по имейл.' },
]

export default function FaqSection() {
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Често задавани въпроси</h2>
        <div className="mt-12 space-y-6">
          {faqs.map(({ q, a }, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900">{q}</h3>
              <p className="mt-2 text-sm text-gray-600">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
