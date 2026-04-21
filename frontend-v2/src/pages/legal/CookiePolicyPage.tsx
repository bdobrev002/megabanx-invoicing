import { Cookie } from 'lucide-react'

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-8 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Cookie className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Политика за бисквитки на MegaBanx</h1>
          <p className="text-indigo-200 text-sm mt-2">Версия 1.0 | В сила от: 05.04.2026 г.</p>
        </div>

        {/* Intro */}
        <div className="px-6 pt-6">
          <p className="text-sm text-gray-600 leading-relaxed italic">
            Настоящата Политика за бисквитки описва какви бисквитки (cookies) използва платформата MegaBanx (megabanx.com),
            управлявана от Д-РЕНТ ЕООД, ЕИК: 200551856.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* 1 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">1. КАКВО СА БИСКВИТКИТЕ?</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>1.1. Бисквитките (cookies) са малки текстови файлове, които се съхраняват на Вашето устройство (компютър, телефон, таблет) при посещение на уебсайт.</p>
              <p>1.2. Те позволяват на уебсайта да запомни Вашите предпочитания и да подобри потребителското изживяване.</p>
            </div>
          </section>

          {/* 2 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">2. БИСКВИТКИ, КОИТО ИЗПОЛЗВАМЕ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>2.1. MegaBanx използва само <strong>строго необходими (функционални) бисквитки</strong>, които са задължителни за нормалното функциониране на платформата:</p>

              {/* Cookie table */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b">Бисквитка</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b">Описание</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b">Срок</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b">Тип</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100">
                      <td className="px-3 py-2 font-mono text-xs">session_token</td>
                      <td className="px-3 py-2">Поддържане на потребителската сесия след вход</td>
                      <td className="px-3 py-2">24 часа</td>
                      <td className="px-3 py-2">httpOnly, Secure</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-3 py-2 font-mono text-xs">admin_token</td>
                      <td className="px-3 py-2">Достъп до административния панел</td>
                      <td className="px-3 py-2">24 часа</td>
                      <td className="px-3 py-2">httpOnly, Secure</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono text-xs">cookie_consent</td>
                      <td className="px-3 py-2">Запомняне на Вашия избор за бисквитки</td>
                      <td className="px-3 py-2">1 година</td>
                      <td className="px-3 py-2">Persistent</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-2">2.2. <strong>Не използваме</strong> бисквитки за:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) Проследяване на потребители (tracking cookies);</p>
                <p>b) Реклама или маркетинг (advertising cookies);</p>
                <p>c) Аналитика от трети страни (Google Analytics, Facebook Pixel и др.).</p>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">3. БИСКВИТКИ НА ТРЕТИ СТРАНИ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>3.1. При обработка на плащания чрез Stripe, Stripe може да използва свои бисквитки за целите на сигурността и предотвратяване на измами.</p>
              <p>3.2. MegaBanx няма контрол над бисквитките на Stripe. За повече информация, моля вижте <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Политиката за бисквитки на Stripe</a>.</p>
            </div>
          </section>

          {/* 4 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">4. УПРАВЛЕНИЕ НА БИСКВИТКИТЕ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>4.1. Можете да управлявате бисквитките чрез настройките на Вашия браузър:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) <strong>Chrome:</strong> Настройки → Поверителност и сигурност → Бисквитки;</p>
                <p>b) <strong>Firefox:</strong> Настройки → Поверителност и сигурност;</p>
                <p>c) <strong>Safari:</strong> Предпочитания → Поверителност;</p>
                <p>d) <strong>Edge:</strong> Настройки → Бисквитки и разрешения за сайтове.</p>
              </div>
              <p>4.2. <strong>Важно:</strong> Ако деактивирате бисквитките, някои функции на платформата може да не работят правилно (например, няма да можете да останете логнати).</p>
            </div>
          </section>

          {/* 5 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">5. ПРОМЕНИ В ПОЛИТИКАТА</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>5.1. Операторът си запазва правото да актуализира настоящата Политика за бисквитки по всяко време.</p>
              <p>5.2. При съществени промени, потребителите ще бъдат уведомени чрез платформата.</p>
            </div>
          </section>

          {/* 6 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">6. КОНТАКТИ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>За въпроси относно бисквитките:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>Д-РЕНТ ЕООД</p>
                <p>ЕИК: 200551856</p>
                <p>Имейл: <a href="mailto:info@megabanx.com" className="text-indigo-600 hover:underline">info@megabanx.com</a></p>
                <p>Уебсайт: <a href="https://megabanx.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">https://megabanx.com</a></p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-400">Дата на последна актуализация: 05.04.2026 г.</p>
        </div>
      </div>
    </div>
  )
}
