import { Shield } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-8 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Политика за поверителност на MegaBanx</h1>
          <p className="text-indigo-200 text-sm mt-2">Версия 1.0 | В сила от: 05.04.2026 г.</p>
        </div>

        {/* Intro */}
        <div className="px-6 pt-6">
          <p className="text-sm text-gray-600 leading-relaxed italic">
            Д-РЕНТ ЕООД, ЕИК: 200551856, със седалище и адрес на управление: гр. София, Република България
            (наричано по-долу &quot;Оператор&quot;, &quot;Ние&quot;, &quot;Нас&quot;), е администратор на лични данни по смисъла на
            Регламент (ЕС) 2016/679 (GDPR) и Закона за защита на личните данни.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* 1 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">1. ОБХВАТ НА ПОЛИТИКАТА</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>1.1. Настоящата Политика за поверителност описва как събираме, използваме, съхраняваме и защитаваме Вашите лични данни при използване на платформата MegaBanx (megabanx.com).</p>
              <p>1.2. С регистрацията си или използването на платформата, Вие потвърждавате, че сте запознати с тази Политика.</p>
            </div>
          </section>

          {/* 2 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">2. КАКВИ ЛИЧНИ ДАННИ СЪБИРАМЕ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>2.1. При регистрация:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) Имейл адрес (използван за вход и комуникация);</p>
                <p>b) Име (при попълване на профил или верификация);</p>
                <p>c) IP адрес (за сигурност и защита от злоупотреби).</p>
              </div>
              <p>2.2. При добавяне на фирма:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) ЕИК / БУЛСТАТ на фирмата;</p>
                <p>b) Наименование, адрес и данни от Търговския регистър;</p>
                <p>c) Снимка на лична карта и селфи (при верификация чрез документ за самоличност).</p>
              </div>
              <p>2.3. При качване на фактури:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) Съдържанието на качените документи (фактури, PDF, изображения);</p>
                <p>b) Данни, извлечени автоматично от AI: номер, дата, издател, получател, суми, ЕИК/ДДС номера.</p>
              </div>
              <p>2.4. Автоматично събирани данни:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) IP адрес и информация за браузъра;</p>
                <p>b) Дата и час на достъп;</p>
                <p>c) Действия в платформата (качване, изтриване, споделяне).</p>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">3. ЦЕЛИ НА ОБРАБОТВАНЕТО</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>3.1. Обработваме личните Ви данни за следните цели:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) Предоставяне на услугата — регистрация, вход, управление на фактури;</p>
                <p>b) AI обработка — автоматично разпознаване и класифициране на фактури;</p>
                <p>c) Верификация на фирми — потвърждаване на собствеността чрез Търговски регистър и/или документ за самоличност;</p>
                <p>d) Сигурност — защита от неоторизиран достъп, brute-force атаки и злоупотреби;</p>
                <p>e) Комуникация — изпращане на известия, нотификации и системни съобщения;</p>
                <p>f) Фактуриране — управление на абонаменти чрез Stripe;</p>
                <p>g) Подобряване на услугата — анализ на използването за оптимизация.</p>
              </div>
            </div>
          </section>

          {/* 4 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">4. ПРАВНО ОСНОВАНИЕ ЗА ОБРАБОТВАНЕ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>4.1. Изпълнение на договор (чл. 6, ал. 1, б. &bdquo;б&ldquo; от GDPR) — обработването е необходимо за предоставяне на услугата.</p>
              <p>4.2. Легитимен интерес (чл. 6, ал. 1, б. &bdquo;е&ldquo; от GDPR) — сигурност на платформата, защита от злоупотреби.</p>
              <p>4.3. Съгласие (чл. 6, ал. 1, б. &bdquo;а&ldquo; от GDPR) — при верификация с лична карта и селфи, потребителят дава изрично съгласие.</p>
              <p>4.4. Законово задължение (чл. 6, ал. 1, б. &bdquo;в&ldquo; от GDPR) — при необходимост от съхраняване на данни съгласно българското законодателство.</p>
            </div>
          </section>

          {/* 5 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">5. СЪХРАНЕНИЕ И ЗАЩИТА НА ДАННИТЕ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>5.1. Всички фактури и документи се криптират с AES криптиране (Fernet/AES-128-CBC + HMAC-SHA256) преди съхранение на сървъра.</p>
              <p>5.2. Снимки на лични карти и селфита се криптират с Fernet и се съхраняват в защитена директория с ограничен достъп.</p>
              <p>5.3. Паролите и токените за достъп се генерират криптографски (secrets.token_urlsafe) и не се съхраняват в открит вид.</p>
              <p>5.4. Комуникацията между Вашия браузър и нашите сървъри е защитена с TLS/SSL криптиране (HTTPS).</p>
              <p>5.5. Достъпът до административния панел е защитен с rate limiting (макс. 5 опита за вход на минута от един IP адрес).</p>
            </div>
          </section>

          {/* 6 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">6. СПОДЕЛЯНЕ НА ДАННИ С ТРЕТИ СТРАНИ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>6.1. Google Gemini AI — съдържанието на фактурите се изпраща към Google Gemini API единствено за целите на AI обработка (разпознаване на текст и данни). Google обработва данните съгласно своята политика за поверителност.</p>
              <p>6.2. Stripe — за обработка на плащания. Stripe е сертифициран по PCI DSS Level 1 и обработва данните съгласно своята политика за поверителност.</p>
              <p>6.3. Търговски регистър — публично достъпни данни за фирми се извличат от Търговския регистър на Република България за верификация.</p>
              <p>6.4. Не продаваме, не отдаваме под наем и не споделяме Вашите лични данни с трети страни за маркетингови цели.</p>
            </div>
          </section>

          {/* 7 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">7. БИСКВИТКИ (COOKIES)</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>7.1. MegaBanx използва следните бисквитки:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) session_token — за поддържане на Вашата сесия след вход (httpOnly, сигурна);</p>
                <p>b) admin_token — за достъп до административния панел (httpOnly, сигурна);</p>
                <p>c) Технически бисквитки — необходими за нормалното функциониране на платформата.</p>
              </div>
              <p>7.2. Не използваме бисквитки за проследяване, реклама или аналитика от трети страни.</p>
              <p>7.3. Бисквитките за сесия изтичат след 24 часа или при излизане от системата.</p>
            </div>
          </section>

          {/* 8 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">8. ВАШИТЕ ПРАВА (GDPR)</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>8.1. Като субект на данни, Вие имате следните права:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) Право на достъп — да получите информация какви данни обработваме за Вас;</p>
                <p>b) Право на коригиране — да поискате корекция на неточни данни;</p>
                <p>c) Право на изтриване (&bdquo;правото да бъдеш забравен&ldquo;) — да поискате изтриване на Вашите данни;</p>
                <p>d) Право на ограничаване на обработването;</p>
                <p>e) Право на преносимост на данните — да получите данните си в структуриран формат;</p>
                <p>f) Право на възражение — да възразите срещу обработването на данните Ви;</p>
                <p>g) Право на оттегляне на съгласието — по всяко време, без това да засяга законосъобразността на обработването преди оттеглянето.</p>
              </div>
              <p>8.2. За упражняване на тези права, моля свържете се с нас на: info@megabanx.com</p>
              <p>8.3. Имате право да подадете жалба до Комисията за защита на личните данни (КЗЛД):</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>Адрес: бул. &bdquo;Проф. Цветан Лазаров&ldquo; № 2, 1592 София</p>
                <p>Уебсайт: <a href="https://www.cpdp.bg" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">https://www.cpdp.bg</a></p>
                <p>Имейл: kzld@cpdp.bg</p>
              </div>
            </div>
          </section>

          {/* 9 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">9. СРОК НА СЪХРАНЕНИЕ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>9.1. Личните данни се съхраняват за срока на действие на Вашия акаунт в MegaBanx.</p>
              <p>9.2. При изтриване на акаунт, всички лични данни, фактури и документи се изтриват в рамките на 30 дни.</p>
              <p>9.3. Снимки от верификация (лична карта + селфи) се съхраняват до завършване на верификацията и максимум 90 дни след това.</p>
              <p>9.4. Логове за сигурност (IP адреси, опити за вход) се съхраняват до 12 месеца.</p>
            </div>
          </section>

          {/* 10 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">10. ПРОМЕНИ В ПОЛИТИКАТА</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>10.1. Операторът си запазва правото да актуализира настоящата Политика за поверителност по всяко време.</p>
              <p>10.2. При съществени промени, потребителите ще бъдат уведомени чрез платформата или по имейл.</p>
              <p>10.3. Продължаването на ползването на платформата след публикуване на промените се счита за приемане на актуализираната Политика.</p>
            </div>
          </section>

          {/* 11 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">11. КОНТАКТИ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>За въпроси относно защитата на личните данни:</p>
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
