import { useState } from 'react'
import { HelpCircle, FolderSync, Share2, Brain, Lock, Shield, Clock, CreditCard, UserPlus, FileText, Trash2, ScanLine, Mail, ChevronDown, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/utils/constants'

const faqs = [
  { q: 'Мога ли да издавам и качвам фактури за различни фирми?', a: 'Да! MegaBanx автоматично разпознава за коя фирма се отнася документът чрез AI и го подрежда в правилната папка (Покупки или Продажби), без нужда от предварително сортиране.', icon: FolderSync },
  { q: 'Как става споделянето на фактури с контрагенти?', a: 'Системата автоматично разпознава получателя по фактурата. Ако той също е в MegaBanx, документът се появява в неговия профил мигновено. Край на изпращането на фактури по имейл.', icon: Share2 },
  { q: 'Какво означава \u201cАвтоматично именуване\u201d?', a: 'Нашият AI извлича номера на фактурата, датата и името на доставчика, и преименува файла автоматично. Така архивът ви е винаги подреден и лесен за търсене.', icon: Brain },
  { q: 'Защитени ли са моите фактури?', a: 'Да! Всички фактури и документи в MegaBanx са криптирани с AES криптиране (Fernet/AES-128-CBC + HMAC-SHA256). Дори при евентуален неоторизиран достъп до сървъра, файловете са напълно нечетими без криптографския ключ.', icon: Lock },
  { q: 'Защо е необходима верификация при въвеждане на фирма?', a: 'Верификацията е създадена за защита на самите потребители. Чрез нея гарантираме, че никой не може да използва данните на чужда фирма без съгласието на легитимните собственици. Процесът е прост — еднократен превод от фирмената сметка.', icon: Shield },
  { q: 'Колко време се съхраняват фактурите ми?', a: 'Фактурите ви се съхраняват неограничено време в MegaBanx. Няма срок на изтичане — документите остават достъпни докато имате активен акаунт. Всички файлове са криптирани и безопасно съхранени на нашите сървъри.', icon: Clock },
  { q: 'Мога ли да споделям фактури с други потребители?', a: 'Да! MegaBanx автоматично споделя фактурите с контрагентите ви. Когато качите фактура, системата разпознава получателя и ако той е регистриран в MegaBanx, документът се появява в неговия профил мигновено.', icon: Share2 },
  { q: 'Безплатен ли е MegaBanx?', a: 'Да, MegaBanx предлага безплатен план, който включва управление на до 3 фирми. За повече фирми или разширени функции, можете да преминете към платен абонамент.', icon: CreditCard },
  { q: 'Как се регистрирам в системата?', a: 'Регистрацията е бърза и лесна — просто въведете имейл адреса си и ще получите код за вход. Не е нужна парола! При всяко влизане получавате еднократен код на имейла си, което е по-сигурно от традиционните пароли.', icon: UserPlus },
  { q: 'Какви формати на фактури се поддържат?', a: 'MegaBanx поддържа PDF формат за фактури. Просто качете вашия PDF файл и системата автоматично ще извлече номера, датата, сумата и данните на контрагента чрез AI разпознаване.', icon: FileText },
  { q: 'Мога ли да изтрия качена фактура?', a: 'Да, можете да изтриете всяка фактура, която сте качили. При изтриване, фактурата се премахва и от профила на контрагента, ако е била споделена. Изтриването е окончателно и не може да бъде отменено.', icon: Trash2 },
  { q: 'Как работи автоматичното разпознаване на фактури?', a: 'Нашият AI анализира качения PDF файл и автоматично извлича ключова информация: номер на фактура, дата на издаване, име на издател/получател, ЕИК, ДДС номер и обща сума.', icon: ScanLine },
  { q: 'Какво се случва ако контрагентът ми не е в MegaBanx?', a: 'Ако контрагентът ви не е регистриран в системата, можете да му изпратите фактурата по имейл директно от MegaBanx. Той ще получи линк за сваляне на фактурата и покана да се регистрира безплатно.', icon: Mail },
]

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <HelpCircle className="w-4 h-4" /> FAQ
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Често задавани въпроси</h2>
          <p className="text-gray-500">Отговори на най-честите въпроси за издаване, обработка и доставка на фактури</p>
        </div>

        <div className="space-y-4">
          {faqs.map(({ q, a, icon: Icon }, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-gray-50"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${openIndex === idx ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="flex-1 font-semibold text-gray-900">{q}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === idx ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-5 pl-20">
                  <p className="text-gray-600 leading-relaxed">{a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-gray-500 text-sm mb-3">Не намерихте отговор на вашия въпрос?</p>
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
