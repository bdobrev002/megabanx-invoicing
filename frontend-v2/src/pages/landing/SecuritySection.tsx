import { Shield, Lock, Building2, CreditCard, CheckCircle } from 'lucide-react'

const verificationSteps = [
  'Регистрирайте се безплатно в MegaBanx',
  'Добавете фирма чрез ЕИК — данните се зареждат от Търговския регистър',
  'Направете еднократен превод от фирмената сметка за верификация',
  'След одобрение, акаунтът ви е активен и защитен',
]

export default function SecuritySection() {
  return (
    <section id="security" className="py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <Shield className="w-4 h-4" /> Сигурност
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Сигурност и верификация</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Вашите данни и фактури са защитени с най-модерните технологии</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Why verification */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Защо е необходима верификация?</h3>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              Верификацията е създадена за защита на самите потребители. Чрез нея гарантираме, че никой не може да използва данните на чужда фирма без съгласието на легитимните собственици.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Процесът е прост — еднократен превод от фирмената сметка, който потвърждава, че вие сте оторизирано лице за тази фирма. Така всички данни и фактури остават достъпни само за истинските им собственици.
            </p>
          </div>

          {/* Right: Steps */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Как работи процесът?</h3>
            </div>
            <div className="space-y-4">
              {verificationSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-gray-600">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom encryption box */}
        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">AES-128-CBC криптиране</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">HMAC-SHA256 верификация</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              <span className="text-sm font-medium">SSL/TLS защитена връзка</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">GDPR съвместимост</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
