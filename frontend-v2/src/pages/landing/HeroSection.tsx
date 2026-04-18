import { Link } from 'react-router-dom'
import { Sparkles, Brain, Building2, FolderSync, Download, Bell, Share2, History, Shield, FileText, Receipt, ArrowRight } from 'lucide-react'
import { ROUTES } from '@/utils/constants'

const features = [
  { icon: Brain, title: 'AI обработка', desc: 'Изкуственият интелект разпознава данните от фактурите автоматично — номер, дата, контрагент, сума.' },
  { icon: Building2, title: 'Търговски регистър', desc: 'Въведете ЕИК и данните се зареждат автоматично от Търговския регистър.' },
  { icon: FolderSync, title: 'Автоматична организация', desc: 'Фактурите се сортират по фирми и типове (Покупки/Продажби) автоматично.' },
  { icon: Download, title: 'Сваляне на фактури', desc: 'Свалете всяка фактура поотделно или групово като ZIP архив.' },
  { icon: Bell, title: 'Известия и нотификации', desc: 'Мигновени WebSocket известия при нови фактури, споделяния и промени.' },
  { icon: Share2, title: 'Споделяне с контрагенти', desc: 'Фактурите автоматично се споделят с контрагентите ви в MegaBanx.' },
  { icon: History, title: 'Пълна история', desc: 'Детайлна история на всяка фактура — кой я качи, кога, какви промени има.' },
  { icon: Shield, title: 'Сигурност', desc: 'SSL криптиране, верификация на фирми, GDPR съвместимост и AES криптиране на файлове.' },
  { icon: Receipt, title: 'Издаване и доставка', desc: 'Издавайте фактури директно в MegaBanx и ги изпращайте автоматично на клиентите.' },
  { icon: FileText, title: 'Структура на фактурите', desc: 'Ясна и прегледна структура на всяка фактура с всички задължителни реквизити.' },
]

export default function HeroSection() {
  return (
    <section id="hero" className="bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Hero content */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" /> Powered by AI
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl leading-tight">
            Издавайте и управлявайте фактурите си
            <span className="block text-indigo-600">интелигентно и автоматично</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            MegaBanx ви позволява да издавате фактури и да ги изпращате автоматично на вашите клиенти. Качвайте получени фактури и нашият AI ще ги обработи, категоризира и сподели с контрагентите ви — без ръчна работа.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              to={ROUTES.REGISTER}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
            >
              Започнете безплатно <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-8 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Как работи?
            </a>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
