import { FileText } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-8 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Общи условия за ползване на MegaBanx</h1>
          <p className="text-indigo-200 text-sm mt-2">Версия 2.0 | В сила от: 05.04.2026 г.</p>
        </div>

        {/* Intro */}
        <div className="px-6 pt-6">
          <p className="text-sm text-gray-600 leading-relaxed italic">
            Настоящите Общи условия уреждат отношенията между Д-РЕНТ ЕООД, ЕИК: 200551856
            (наричано по-долу &quot;Оператор&quot;, &quot;Ние&quot;, &quot;MegaBanx&quot;), и потребителите на платформата MegaBanx (megabanx.com).
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* 1 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">1. ОБЩИ РАЗПОРЕДБИ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>1.1. MegaBanx е онлайн платформа за управление, обработка и съхранение на фактури с помощта на изкуствен интелект (AI).</p>
              <p>1.2. С регистрацията си в платформата, Вие приемате настоящите Общи условия и се задължавате да ги спазвате.</p>
              <p>1.3. Операторът си запазва правото да променя тези Общи условия по всяко време, като промените влизат в сила от момента на публикуването им на сайта.</p>
            </div>
          </section>

          {/* 2 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">2. ОПИСАНИЕ НА УСЛУГАТА</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>2.1. MegaBanx предоставя следните услуги:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) Качване и съхранение на фактури (PDF, изображения);</p>
                <p>b) Автоматично разпознаване на данни от фактури чрез AI (Google Gemini);</p>
                <p>c) Организация и класификация на фактури по фирми;</p>
                <p>d) Споделяне на фактури между оторизирани потребители;</p>
                <p>e) Верификация на фирми чрез Търговски регистър и/или документ за самоличност;</p>
                <p>f) Известия и нотификации за нови и споделени фактури;</p>
                <p>g) Експорт на данни;</p>
                <p>h) Управление на абонаменти и плащания чрез Stripe.</p>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">3. РЕГИСТРАЦИЯ И ДОСТЪП</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>3.1. За използване на платформата е необходима регистрация с валиден имейл адрес.</p>
              <p>3.2. При регистрация, потребителят получава имейл с код за потвърждение (верификация на имейл).</p>
              <p>3.3. Потребителят е отговорен за поверителността на своите данни за достъп (имейл и парола).</p>
              <p>3.4. Един потребител може да управлява множество фирми чрез един акаунт.</p>
            </div>
          </section>

          {/* 4 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">4. ВЕРИФИКАЦИЯ НА ФИРМИ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>4.1. За достъп до пълните функционалности, фирмите трябва да преминат верификация.</p>
              <p>4.2. Верификацията може да се извърши чрез:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) Автоматична проверка в Търговския регистър (по ЕИК);</p>
                <p>b) Ръчна верификация с документ за самоличност (лична карта + селфи).</p>
              </div>
              <p>4.3. Операторът си запазва правото да откаже верификация при съмнения за злоупотреба или невалидни документи.</p>
              <p>4.4. Снимките от верификация се криптират и съхраняват съгласно Политиката за поверителност.</p>
            </div>
          </section>

          {/* 5 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">5. АБОНАМЕНТНИ ПЛАНОВЕ И ЦЕНООБРАЗУВАНЕ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>5.1. MegaBanx предлага следните планове:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) <strong>Безплатен пробен период</strong> — 7 дни с пълен достъп до всички функции;</p>
                <p>b) <strong>Месечен план</strong> — 19.99 лв./месец;</p>
                <p>c) <strong>Годишен план</strong> — 199.99 лв./година (еквивалент на ~16.67 лв./месец).</p>
              </div>
              <p>5.2. Всички цени са в български лева (BGN) и включват ДДС, където е приложимо.</p>
              <p>5.3. Операторът си запазва правото да променя цените с предварително уведомление от минимум 30 дни.</p>
            </div>
          </section>

          {/* 6 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">6. ПЛАЩАНИЯ И АВТОМАТИЧНО ПОДНОВЯВАНЕ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>6.1. Плащанията се обработват чрез Stripe — сертифициран платежен процесор (PCI DSS Level 1).</p>
              <p>6.2. MegaBanx НЕ съхранява данни за банкови карти на своите сървъри.</p>
              <p>6.3. Абонаментите се подновяват автоматично в края на всеки период (месец или година).</p>
              <p>6.4. Потребителят може да отмени автоматичното подновяване по всяко време от настройките на акаунта си.</p>
              <p>6.5. При отмяна, достъпът остава активен до края на текущия платен период.</p>
            </div>
          </section>

          {/* 7 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">7. ЗАЩИТА НА ДАННИТЕ И СИГУРНОСТ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>7.1. Всички качени фактури и документи се криптират с AES криптиране (Fernet/AES-128-CBC + HMAC-SHA256).</p>
              <p>7.2. Комуникацията е защитена с TLS/SSL (HTTPS).</p>
              <p>7.3. Подробна информация за обработката на лични данни е достъпна в Политиката за поверителност.</p>
            </div>
          </section>

          {/* 8 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">8. СПОДЕЛЯНЕ НА ДАННИ И ДОСТЪП НА ТРЕТИ СТРАНИ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>8.1. Потребителят може да споделя фактури с други регистрирани потребители в платформата.</p>
              <p>8.2. При споделяне, получателят получава достъп до споделените фактури, но не може да ги изтрива или модифицира.</p>
              <p>8.3. За AI обработка, съдържанието на фактурите се изпраща към Google Gemini API. Google обработва данните съгласно своята политика за поверителност.</p>
            </div>
          </section>

          {/* 9 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">9. ОГРАНИЧАВАНЕ НА ОТГОВОРНОСТТА</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>9.1. Операторът не носи отговорност за:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) Грешки в автоматичното разпознаване на данни от фактури (AI обработката е помощен инструмент и не замества ръчната проверка);</p>
                <p>b) Загуба на данни поради форсмажорни обстоятелства;</p>
                <p>c) Неоторизиран достъп до акаунта поради небрежност на потребителя (споделяне на парола, използване на слаба парола);</p>
                <p>d) Прекъсвания на услугата поради планирана поддръжка или технически проблеми.</p>
              </div>
              <p>9.2. Максималната отговорност на Оператора е ограничена до сумата на платените от потребителя такси за последните 12 месеца.</p>
            </div>
          </section>

          {/* 10 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">10. ПРЕКРАТЯВАНЕ НА АКАУНТ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>10.1. Потребителят може да изтрие акаунта си по всяко време от настройките.</p>
              <p>10.2. При изтриване, всички данни (фактури, документи, лична информация) се изтриват в рамките на 30 дни.</p>
              <p>10.3. Операторът може да прекрати акаунт при:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) Нарушаване на настоящите Общи условия;</p>
                <p>b) Злоупотреба с платформата;</p>
                <p>c) Качване на незаконно съдържание;</p>
                <p>d) Опит за неоторизиран достъп до чужди акаунти или данни.</p>
              </div>
            </div>
          </section>

          {/* 11 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">11. ИНТЕЛЕКТУАЛНА СОБСТВЕНОСТ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>11.1. Платформата MegaBanx, включително нейният дизайн, код, лого и функционалности, е интелектуална собственост на Д-РЕНТ ЕООД.</p>
              <p>11.2. Потребителите запазват правата си върху качените от тях документи и фактури.</p>
              <p>11.3. Забранено е копирането, модифицирането или разпространяването на елементи от платформата без изрично писмено съгласие.</p>
            </div>
          </section>

          {/* 12 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">12. СЪГЛАСИЕ ЗА ЗАПИС НА ДАННИ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>12.1. С използването на платформата, потребителят се съгласява с автоматичното записване на:</p>
              <div className="ml-4 space-y-1 text-gray-600">
                <p>a) Действия в системата (качване, изтриване, споделяне на фактури);</p>
                <p>b) IP адрес и информация за браузъра;</p>
                <p>c) Дата и час на достъп.</p>
              </div>
              <p>12.2. Тези записи се използват единствено за целите на сигурността и подобряването на услугата.</p>
            </div>
          </section>

          {/* 13 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">13. ПРИЛОЖИМО ПРАВО И СПОРОВЕ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>13.1. Настоящите Общи условия се подчиняват на законодателството на Република България.</p>
              <p>13.2. Всички спорове ще бъдат разрешавани чрез преговори, а при невъзможност — от компетентния български съд.</p>
              <p>13.3. За въпроси, свързани с лични данни, потребителите могат да се обърнат към Комисията за защита на личните данни (КЗЛД).</p>
            </div>
          </section>

          {/* 14 */}
          <section className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">14. КОНТАКТИ</h2>
            <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <p>За въпроси относно Общите условия:</p>
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
