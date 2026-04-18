import { Shield, Lock, Check, Globe, Eye } from 'lucide-react'

const verificationSteps = [
  { num: 1, color: 'bg-indigo-100 text-indigo-600', text: <><strong>Регистрация:</strong> Създавате акаунт с имейл адрес и потвърждавате с код.</> },
  { num: 2, color: 'bg-indigo-100 text-indigo-600', text: <><strong>Добавяне на фирма:</strong> Въвеждате ЕИК и данните се зареждат от Търговския регистър.</> },
  { num: 3, color: 'bg-indigo-100 text-indigo-600', text: <><strong>Верификация:</strong> Превеждате 1 EUR по нашата сметка с уникален код в основанието. Сумата се приспада от бъдещи такси.</> },
  { num: 4, color: 'bg-green-100 text-green-600', text: <><strong>Потвърждение:</strong> Проверяваме наредителя на превода с данните от ТР. Ако съвпадат — фирмата е активирана!</> },
]

export default function SecuritySection() {
  return (
    <section id="security" className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Сигурност и верификация</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">Защитаваме вашите финансови данни с многостепенна верификация</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Why verification */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><Lock className="w-5 h-5 text-indigo-600" /> Защо е необходима верификация?</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              Фактурите съдържат чувствителна финансова информация — суми, банкови данни, ДДС номера. Без верификация, някой може да регистрира чужда фирма и да получи достъп до фактурите й.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Затова MegaBanx изисква потвърждение, че вие сте оправомощено лице да управлявате фактурите на дадена фирма. Това защитава вас и вашите контрагенти.
            </p>
          </div>

          {/* Right: Steps */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><Check className="w-5 h-5 text-green-600" /> Как работи процесът?</h3>
            <div className="space-y-3">
              {verificationSteps.map((step) => (
                <div key={step.num} className="flex gap-3">
                  <div className={`w-7 h-7 ${step.color} rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    {step.num}
                  </div>
                  <p className="text-sm text-gray-600">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom encryption box */}
        <div className="mt-8 bg-indigo-600 rounded-2xl p-6 text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Globe className="w-6 h-6" />
            <Eye className="w-6 h-6" />
            <Shield className="w-6 h-6" />
          </div>
          <p className="text-sm opacity-90 max-w-2xl mx-auto">
            Всички качени файлове (фактури, PDF, изображения) се криптират на сървъра с AES криптиране (Fernet: AES-128-CBC + HMAC-SHA256).
            Дори при пробив в системата, файловете са нечетими без криптографския ключ. Използваме SSL за всяка връзка
            и никога не споделяме данните ви с трети страни. Спазваме GDPR и всички европейски регулации за защита на данни.
          </p>
        </div>
      </div>
    </section>
  )
}
