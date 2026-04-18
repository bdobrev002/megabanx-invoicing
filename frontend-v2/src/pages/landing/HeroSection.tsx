import { Link } from 'react-router-dom'
import {
  Zap, Brain, Building2, FolderSync, Download, Bell, ArrowLeftRight,
  BarChart3, Shield, Mail, Receipt, Check, ArrowRight,
} from 'lucide-react'
import { ROUTES } from '@/utils/constants'

const features = [
  { icon: Brain, title: 'AI обработка', desc: 'Изкуственият интелект разпознава данните от фактурите — дата, номер, издател, получател, суми — автоматично и точно.', color: 'bg-purple-100 text-purple-600' },
  { icon: Building2, title: 'Търговски регистър', desc: 'Въведете ЕИК и данните на фирмата се зареждат автоматично. Без ръчно въвеждане на имена, адреси и ДДС номера.', color: 'bg-blue-100 text-blue-600' },
  { icon: FolderSync, title: 'Автоматична организация', desc: 'Фактурите се сортират по фирми и типове (покупки/продажби) автоматично. Никога повече хаос в папките.', color: 'bg-green-100 text-green-600' },
  { icon: Download, title: 'Сваляне на фактури', desc: 'Свалете всяка фактура поотделно или групово. Изберете няколко файла и ги свалете с един клик.', color: 'bg-teal-100 text-teal-600' },
  { icon: Bell, title: 'Известия и нотификации', desc: 'Мигновени WebSocket известия при нови фактури, одобрения и промени. Плюс имейл нотификации за всяко събитие.', color: 'bg-red-100 text-red-600' },
  { icon: ArrowLeftRight, title: 'Споделяне с контрагенти', desc: 'Фактурите автоматично се споделят с контрагентите ви в системата. Те получават известие и могат да одобрят.', color: 'bg-orange-100 text-orange-600' },
  { icon: BarChart3, title: 'Пълна история', desc: 'Детайлна история на всяка фактура — кога е качена, обработена, одобрена. Филтриране и търсене по всички полета.', color: 'bg-cyan-100 text-cyan-600' },
  { icon: Shield, title: 'Сигурност', desc: 'SSL криптиране, верификация на фирми, GDPR съвместимост. Данните ви са защитени на европейски сървъри.', color: 'bg-emerald-100 text-emerald-600' },
  { icon: Mail, title: 'Издаване и доставка', desc: 'Издавайте фактури директно в MegaBanx или качете готови документи — контрагентите ви ги получават автоматично по имейл и в системата. Без ръчно изпращане, без прикачени файлове. Всичко е автоматизирано от край до край.', color: 'bg-indigo-100 text-indigo-600' },
  { icon: Receipt, title: 'Структура на фактурите', desc: 'Ясна и прегледна структура на всяка фактура — редове, количества, мерни единици, ДДС ставки и суми. Кочани с 10-цифрени номера за пълен контрол.', color: 'bg-violet-100 text-violet-600' },
]

export default function HeroSection() {
  return (
    <div>
      {/* Hero */}
      <section className="py-16 px-6 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-4 h-4" /> AI-базирана обработка на фактури
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            Издавайте и управлявайте фактурите си<br />
            <span className="text-indigo-600">интелигентно и автоматично</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            MegaBanx ви позволява да издавате фактури и да ги изпращате автоматично на контрагентите, да качвате и организирате документи с AI, и да спестявате часове ръчна работа. Без сложни настройки — започнете веднага.
          </p>

          {/* AI sorting info box */}
          <div className="bg-indigo-50 rounded-2xl p-5 max-w-3xl mx-auto mb-8 text-left">
            <h3 className="text-base font-bold text-indigo-800 mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5" /> Без предварително сортиране!
            </h3>
            <p className="text-sm text-indigo-700 leading-relaxed">
              Издавайте фактури директно от системата или качете готови документи от множество фирми.{' '}
              <strong>Не е нужно да сортирате фактурите предварително!</strong> Просто качете
              всички сканирани или генерирани фактури (PDF, JPEG, PNG и др.) — без значение за коя ваша фирма се отнасят — и натиснете
              &quot;Обработка с AI&quot;. Нашият изкуствен интелект автоматично ще:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-indigo-700">
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> <span>Разпознае и наименова всяка фактура (дата, номер, издател, получател)</span></li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> <span>Разпредели фактурите по съответните фирми в профила ви</span></li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> <span>Сортира ги в папки &quot;Покупки&quot; и &quot;Продажби&quot; на всяка фирма</span></li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> <span>Предостави копие на контрагента, където автоматично ще се сортират в неговите папки</span></li>
            </ul>
            <p className="mt-3 text-sm text-indigo-800 font-semibold">Всичко е 100% автоматизирано с най-модерни AI технологии за максимално улеснение.</p>
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to={ROUTES.REGISTER}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2"
            >
              Започнете безплатно <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how"
              className="px-8 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition"
            >
              Как работи?
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-4">Безплатен план — без кредитна карта</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Всичко, от което се нуждаете</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Пълен набор от инструменти за ефективно управление на фактурите на вашия бизнес</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-5 hover:shadow-lg transition-shadow">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
