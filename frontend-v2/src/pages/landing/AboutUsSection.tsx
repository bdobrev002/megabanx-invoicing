import { Users2, Sparkles, Brain, Rocket, Building2, Globe, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/utils/constants'

export default function AboutUsSection() {
  return (
    <section id="about-us" className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <Users2 className="w-4 h-4" /> За нас
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Кои сме ние</h2>
          <p className="text-gray-500">Историята зад MegaBanx</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 via-white to-blue-50 rounded-3xl p-8 md:p-12 mb-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Как се роди идеята</h3>
              <p className="text-gray-600 leading-relaxed">Като собственици на малък бизнес, ежедневно се сблъсквахме с хаос от фактури — десетки PDF файлове разпръснати в имейли, папки и чатове. Изпращането на фактури до клиенти и контрагенти отнемаше часове, а намирането на стара фактура беше като търсене на игла в купа сено.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Създадено изцяло с AI</h3>
              <p className="text-gray-600 leading-relaxed">Уникалното на MegaBanx е, че целият продукт — от сървърната логика до потребителския интерфейс — е създаден <strong>изцяло с изкуствен интелект</strong>, без участието на екип от програмисти. Това е доказателство, че AI не само обработва вашите фактури, но е създал и самата платформа, която го прави.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Нашата мисия</h3>
              <p className="text-gray-600 leading-relaxed">Да автоматизираме изцяло управлението на фактури за малкия и среден бизнес в България. Без ръчно сортиране, без изпращане по имейл, без хаос. Качете и готово — AI се грижи за всичко останало.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2">Фирма</h4>
            <p className="text-gray-600 text-sm">Д-РЕНТ ЕООД</p>
            <p className="text-gray-500 text-sm">ЕИК: 200551856</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2">Локация</h4>
            <p className="text-gray-600 text-sm">гр. София, България</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">Имате въпроси? Свържете се с нас!</p>
          <Link
            to={ROUTES.CONTACT}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            <MessageSquare className="w-4 h-4" /> Свържете се с нас
          </Link>
        </div>
      </div>
    </section>
  )
}
