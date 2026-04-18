import {
  Sparkles, Globe, ArrowRight, FileUp, Brain, UserCheck, CalendarCheck,
  XCircle, Rocket, TrendingUp, ScanLine, Mail, Upload, Bell, Check,
  Building2, FolderSync, Download, BarChart3, ArrowLeftRight, Monitor,
  FileText, FolderOpen, Clock, Zap,
} from 'lucide-react'

export default function HowItWorksSection() {
  return (
    <section id="how" className="py-10 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Hero motivation block */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-10 mb-12 text-center shadow-2xl">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white/90 text-sm font-medium tracking-wide">Бъдещето на фактурирането</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight tracking-tight">
              Издавайте, организирайте и доставяйте автоматично.
            </h2>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-medium">
              MegaBanx <span className="underline decoration-yellow-300 decoration-2 underline-offset-4">автоматизира издаването и обмена на фактури</span> между вас и вашите клиенти.
            </p>
          </div>
        </div>

        {/* Digital bridge text */}
        <div className="bg-gradient-to-r from-sky-50 to-indigo-50 rounded-2xl p-8 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-200/40 to-transparent rounded-bl-full" />
          <div className="relative flex items-start gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2 tracking-tight">Вашият цифров мост към всеки контрагент</h3>
              <p className="text-base text-gray-700 leading-relaxed">
                Издавате или качвате фактура — тя е при клиента и неговия счетоводител{' '}
                <span className="font-bold text-indigo-600">за секунди</span>
                . Без сканиране, без именуване на файлове — доставката е автоматична.
              </p>
            </div>
          </div>
        </div>

        {/* Before vs After comparison */}
        <div className="mb-14">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
              Преди и след Mega<span className="text-indigo-600">Ban</span><span className="text-orange-600">x</span>
            </h2>
            <p className="text-gray-500 mt-2">Вижте разликата с числа</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Before */}
            <div className="relative bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 shadow-sm">
              <div className="absolute -top-3 left-6 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide uppercase">Преди</div>
              <div className="mt-3 flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-black text-red-600">4 часа</div>
                  <div className="text-xs text-red-400 font-medium">на ден</div>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-bold">100 фактури/ден</span> = 4 часа сканиране, именуване и ръчно пращане по имейл.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Сканиране', 'Именуване', 'Имейли'].map(t => (
                  <span key={t} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </div>

            {/* With MegaBanx */}
            <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg ring-2 ring-green-200/50">
              <div className="absolute -top-3 left-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide uppercase">С MegaBanx</div>
              <div className="mt-3 flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-green-600">2 мин</div>
                  <div className="text-xs text-green-500 font-medium">на ден</div>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-bold">100 фактури/ден</span> = 2 минути за Drag & Drop + AI обработка. Всичко е автоматично.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Drag & Drop', 'AI', 'Автоматично'].map(t => (
                  <span key={t} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </div>

            {/* Result */}
            <div className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 shadow-sm">
              <div className="absolute -top-3 left-6 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide uppercase">Резултат</div>
              <div className="mt-3 flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-600">80 часа</div>
                  <div className="text-xs text-amber-500 font-medium">спестени/месец</div>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Спестявате <span className="font-bold">80 часа месечно</span> административен труд. Фокусирайте се върху бизнеса.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Ефективност', 'Спестявания', 'Растеж'].map(t => (
                  <span key={t} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Animated 4-step infographic */}
        <div className="mb-14">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 rounded-full px-4 py-1.5 mb-4">
              <ScanLine className="w-4 h-4" />
              <span className="text-sm font-bold tracking-wide">Как протича процесът?</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">От издаване до подредена счетоводна папка</h2>
            <p className="text-gray-500 mt-2">Издавайте или качвайте. Напълно автоматично.</p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5" style={{backgroundImage: 'repeating-linear-gradient(90deg, #a78bfa 0px, #a78bfa 8px, transparent 8px, transparent 16px)'}} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: 1, icon: FileUp, title: 'Издаване или качване', desc: 'Издайте фактура директно в MegaBanx или качете PDF от складовата програма. Drag & Drop или изберете файлове — готово за секунди.', gradient: 'from-blue-500 to-cyan-500', bgLight: 'bg-blue-50', borderColor: 'border-blue-200', emoji: '\ud83d\udcc4', delay: '0s' },
                { step: 2, icon: Brain, title: 'AI разпознаване', desc: 'Системата анализира данните — дата, номер, издател, получател — и именува файла автоматично: yyyy.mm.dd_Име.', gradient: 'from-purple-500 to-pink-500', bgLight: 'bg-purple-50', borderColor: 'border-purple-200', emoji: '\ud83e\udd16', delay: '0.15s' },
                { step: 3, icon: UserCheck, title: 'Клиентът одобрява', desc: 'Клиентът получава мигновено известие, преглежда фактурата в системата и натиска „Одобрявам“ с един клик.', gradient: 'from-emerald-500 to-green-500', bgLight: 'bg-emerald-50', borderColor: 'border-emerald-200', emoji: '\u2705', delay: '0.3s' },
                { step: 4, icon: CalendarCheck, title: 'Счетоводителят тегли', desc: 'Счетоводителят сваля всичко подредено — в края на деня, седмицата или месеца. Без хаос, без пропуски.', gradient: 'from-amber-500 to-orange-500', bgLight: 'bg-amber-50', borderColor: 'border-amber-200', emoji: '\ud83d\udcca', delay: '0.45s' },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`relative ${s.bgLight} rounded-2xl p-5 border ${s.borderColor} hover:shadow-xl transition-all duration-500 hover:-translate-y-1 group`}
                  style={{animation: `howFadeSlideUp 0.6s ease-out ${s.delay} both`}}
                >
                  <div className={`absolute -top-4 -left-2 w-9 h-9 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center shadow-lg text-white font-black text-sm`}>
                    {s.step}
                  </div>
                  <div className="text-3xl mb-3 mt-1" style={{animation: `howBounceGentle 2s ease-in-out ${s.delay} infinite`}}>
                    {s.emoji}
                  </div>
                  <div className={`w-10 h-10 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900 mb-2 tracking-tight">{s.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                  {s.step < 4 && (
                    <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full border-2 border-gray-200 items-center justify-center shadow-sm">
                      <ArrowRight className="w-4 h-4 text-indigo-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes howFadeSlideUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes howBounceGentle {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-6px); }
            }
          `}</style>
        </div>

        {/* Old way vs New way comparison */}
        <div className="mb-12 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Old way */}
            <div className="p-6 bg-gradient-to-br from-gray-50 to-red-50/30 border-b md:border-b-0 md:border-r">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 tracking-tight">Старият начин</h4>
                  <p className="text-xs text-red-400">Бавно, ръчно, досадно</p>
                </div>
              </div>
              <div className="space-y-3">
                {['Сканирайте всяка фактура', 'Именувайте файла ръчно', 'Отворете имейла', 'Прикачете файла', 'Напишете текст', 'Изпратете на клиента', 'Повторете \u00d7 100 пъти'].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-red-400 text-xs font-bold">{i + 1}</span>
                    </div>
                    <span className="text-gray-600 line-through decoration-red-300">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* New way */}
            <div className="p-6 bg-gradient-to-br from-green-50/30 to-emerald-50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 tracking-tight">С MegaBanx</h4>
                  <p className="text-xs text-green-500">Бързо, автоматично, лесно</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { text: 'Drag & Drop файловете', icon: Upload },
                  { text: 'AI разпознава и именува', icon: Brain },
                  { text: 'Клиентът получава известие', icon: Bell },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-gray-800 font-medium">{step.text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 bg-green-100 rounded-xl p-3 text-center">
                <span className="text-green-700 font-bold text-sm">Готово! Всичко останало е автоматично.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Animation scene */}
        <div className="mb-14">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full px-5 py-2 mb-3">
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-bold tracking-wide">Вижте как работи на практика</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">От издаване до получаване — под 1 минута</h2>
          </div>

          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl">
            {/* Background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="absolute w-1 h-1 bg-white/20 rounded-full" style={{
                  left: `${8 + i * 8}%`, top: `${10 + (i % 3) * 30}%`,
                  animation: `howParticleFloat 3s ease-in-out ${i * 0.3}s infinite alternate`
                }} />
              ))}
            </div>

            {/* Timer badge */}
            <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 z-20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 font-mono text-sm font-bold tracking-wider">\u23f1 00:00</span>
              </div>
              <div className="text-white/50 text-xs mt-0.5 text-right">от 10 сек</div>
            </div>

            {/* Scene */}
            <div className="relative flex items-center justify-between gap-2 md:gap-4 min-h-64 md:min-h-80 z-10">

              {/* Left: Company A */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0 w-20 md:w-28">
                <div className="relative">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border-2 border-blue-300">
                    <span className="text-2xl md:text-3xl">\ud83d\udc68\u200d\ud83d\udcbc</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-xs md:text-sm">Фирма А</div>
                  <div className="text-blue-300 text-xs">Изпращач</div>
                </div>
                <div className="relative w-16 md:w-20 h-20 md:h-24">
                  {['ФА-001.pdf', 'ФА-002.pdf', 'ФА-003.pdf', 'ФА-004.pdf', 'ФА-005.pdf'].map((name, i) => (
                    <div key={i}
                      className="absolute left-0 right-0 bg-white rounded-md px-1.5 py-1 shadow-md border border-gray-200"
                      style={{
                        bottom: `${i * 4}px`,
                        zIndex: 5 - i,
                        animation: `howFilePickUp 10s ease-in-out ${i * 0.6}s infinite`,
                        transformOrigin: 'center bottom',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-red-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-700 truncate">{name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow 1: Upload */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="flex items-center">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 md:w-3 h-0.5 bg-blue-400 rounded-full mx-0.5" style={{animation: `howArrowPulse 1.5s ease-in-out ${i * 0.2}s infinite`}} />
                  ))}
                  <ArrowRight className="w-4 h-4 text-blue-400" style={{animation: 'howArrowPulse 1.5s ease-in-out 0.6s infinite'}} />
                </div>
                <span className="text-blue-300 text-xs font-medium hidden md:block">Качване</span>
              </div>

              {/* Center: MegaBanx processing */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <div className="relative">
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex flex-col items-center justify-center shadow-xl border border-white/20"
                    style={{animation: 'howProcessingGlow 3s ease-in-out infinite'}}>
                    <Brain className="w-8 h-8 md:w-10 md:h-10 text-white mb-1" style={{animation: 'howSpinSlow 4s linear infinite'}} />
                    <span className="text-white font-black text-xs md:text-sm tracking-tight">Mega<span className="text-indigo-300">Ban</span><span className="text-orange-400">x</span></span>
                  </div>
                  <div className="absolute -inset-2 border-2 border-dashed border-purple-400/30 rounded-2xl" style={{animation: 'howSpinSlow 8s linear infinite reverse'}} />
                  {[0,1,2,3].map(i => (
                    <div key={i} className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full" style={{
                      top: ['0%','50%','100%','50%'][i],
                      left: ['50%','100%','50%','0%'][i],
                      transform: 'translate(-50%, -50%)',
                      animation: `howSparkle 2s ease-in-out ${i * 0.5}s infinite`,
                    }} />
                  ))}
                </div>

                {/* Progress bar */}
                <div className="w-24 md:w-36 h-2 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                  <div className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 rounded-full" style={{animation: 'howProgressFill 10s ease-in-out infinite', backgroundSize: '200% 100%'}} />
                </div>

                {/* Timer */}
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-300 font-mono text-sm font-bold">00:10</span>
                  <span className="text-cyan-400/60 text-xs font-medium">сек</span>
                </div>

                {/* Processing labels */}
                <div className="flex flex-col items-center gap-1">
                  {['\ud83d\udcc4 Разчитане...', '\ud83c\udff7\ufe0f Именуване...', '\ud83d\udcc1 Сортиране...', '\u2705 Готово!'].map((label, i) => (
                    <div key={i} className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                      animation: 'howLabelCycle 10s ease-in-out infinite',
                      animationDelay: `${i * 2.5}s`,
                      opacity: 0,
                      color: i === 3 ? '#4ade80' : '#a5b4fc',
                    }}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery arrows SVG */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <svg viewBox="0 0 60 100" className="w-10 h-20 md:w-14 md:h-28" fill="none">
                  <path d="M5 50 Q15 50 30 25 L50 8" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 3" opacity="0.9">
                    <animate attributeName="stroke-dashoffset" values="14;0" dur="1.5s" repeatCount="indefinite" />
                  </path>
                  <polygon points="48,2 55,8 48,14" fill="#60a5fa" opacity="0.9">
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
                  </polygon>
                  <path d="M5 50 Q15 50 30 75 L50 92" stroke="#34d399" strokeWidth="2" strokeDasharray="4 3" opacity="0.9">
                    <animate attributeName="stroke-dashoffset" values="14;0" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
                  </path>
                  <polygon points="48,86 55,92 48,98" fill="#34d399" opacity="0.9">
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
                  </polygon>
                </svg>
                <span className="text-white/60 text-xs font-medium hidden md:block">Доставка</span>
              </div>

              {/* Right: Company A (sorted) + Company B (receiver) */}
              <div className="flex flex-col items-center gap-4 flex-shrink-0 w-24 md:w-32">
                {/* Company A sorted */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <div className="relative">
                    <div className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border-2 border-blue-300">
                      <span className="text-lg md:text-2xl">\ud83d\udc68\u200d\ud83d\udcbc</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-xs">Фирма А</div>
                    <div className="text-blue-300 text-xs leading-tight">Сортирани док.</div>
                  </div>
                  <div className="relative w-full h-14 md:h-16">
                    {['Покупки/', 'Продажби/'].map((folder, i) => (
                      <div key={i}
                        className="absolute left-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md px-1 py-1 shadow-md border border-blue-400"
                        style={{
                          bottom: `${i * 24}px`,
                          animation: `howFolderAppear 10s ease-out ${6 + i * 0.4}s infinite`,
                          opacity: 0,
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <FolderOpen className="w-2.5 h-2.5 text-white flex-shrink-0" />
                          <span className="text-xs font-bold text-white truncate">{folder}</span>
                        </div>
                        <div className="flex gap-0.5 mt-0.5">
                          {[0,1].map(j => (
                            <div key={j} className="w-2.5 h-2.5 bg-white/30 rounded-sm" style={{animation: `howMiniFileAppear 10s ease-out ${7 + i * 0.4 + j * 0.2}s infinite`, opacity: 0}} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-16 h-px bg-white/10" />

                {/* Company B receiver */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <div className="relative">
                    <div className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-emerald-300">
                      <span className="text-lg md:text-2xl">\ud83d\udc69\u200d\ud83d\udcbc</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center" style={{animation: 'howNotifBounce 10s ease-in-out infinite'}}>
                      <Bell className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-xs">Фирма Б</div>
                    <div className="text-emerald-300 text-xs leading-tight">Получател</div>
                  </div>
                  <div className="relative w-full h-14 md:h-16">
                    {['Покупки/', 'Продажби/'].map((folder, i) => (
                      <div key={i}
                        className="absolute left-0 right-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-md px-1 py-1 shadow-md border border-emerald-400"
                        style={{
                          bottom: `${i * 24}px`,
                          animation: `howFolderAppear 10s ease-out ${6.5 + i * 0.4}s infinite`,
                          opacity: 0,
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <FolderOpen className="w-2.5 h-2.5 text-white flex-shrink-0" />
                          <span className="text-xs font-bold text-white truncate">{folder}</span>
                        </div>
                        <div className="flex gap-0.5 mt-0.5">
                          {[0,1].map(j => (
                            <div key={j} className="w-2.5 h-2.5 bg-white/30 rounded-sm" style={{animation: `howMiniFileAppear 10s ease-out ${7.5 + i * 0.4 + j * 0.2}s infinite`, opacity: 0}} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom result bar */}
            <div className="mt-6 bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-white/80 text-sm"><span className="font-bold text-white">5 файла</span> качени</span>
              </div>
              <div className="w-px h-4 bg-white/20 hidden md:block" />
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-white/80 text-sm"><span className="font-bold text-white">AI обработка</span></span>
              </div>
              <div className="w-px h-4 bg-white/20 hidden md:block" />
              <div className="flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-green-400" />
                <span className="text-white/80 text-sm"><span className="font-bold text-white">Автоматично</span> сортирани</span>
              </div>
              <div className="w-px h-4 bg-white/20 hidden md:block" />
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-white/80 text-sm">за <span className="font-bold text-green-400">&lt; 1 мин</span></span>
              </div>
            </div>
          </div>

          {/* Animation CSS for the scene */}
          <style>{`
            @keyframes howParticleFloat {
              from { transform: translateY(0) scale(1); opacity: 0.2; }
              to { transform: translateY(-20px) scale(1.5); opacity: 0.5; }
            }
            @keyframes howFilePickUp {
              0%, 5% { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
              10%, 15% { transform: translateX(40px) translateY(-30px) scale(0.9); opacity: 0.8; }
              20% { transform: translateX(80px) translateY(-10px) scale(0.7); opacity: 0; }
              25%, 100% { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
            }
            @keyframes howArrowPulse {
              0%, 100% { opacity: 0.3; transform: scaleX(1); }
              50% { opacity: 1; transform: scaleX(1.3); }
            }
            @keyframes howProcessingGlow {
              0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1); }
              50% { box-shadow: 0 0 30px rgba(168,85,247,0.5), 0 0 80px rgba(168,85,247,0.2); }
            }
            @keyframes howSpinSlow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes howSparkle {
              0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
              50% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
            }
            @keyframes howProgressFill {
              0% { width: 0%; background-position: 0% 0; }
              40% { width: 70%; }
              60% { width: 85%; }
              80%, 100% { width: 100%; background-position: -200% 0; }
            }
            @keyframes howLabelCycle {
              0%, 15% { opacity: 0; transform: translateY(5px); }
              20%, 30% { opacity: 1; transform: translateY(0); }
              35%, 100% { opacity: 0; transform: translateY(-5px); }
            }
            @keyframes howNotifBounce {
              0%, 55% { transform: scale(0); opacity: 0; }
              60% { transform: scale(1.3); opacity: 1; }
              65%, 90% { transform: scale(1); opacity: 1; }
              95%, 100% { transform: scale(0); opacity: 0; }
            }
            @keyframes howFolderAppear {
              0%, 55% { opacity: 0; transform: translateX(-20px) scale(0.8); }
              65% { opacity: 1; transform: translateX(0) scale(1.05); }
              70%, 90% { opacity: 1; transform: translateX(0) scale(1); }
              95%, 100% { opacity: 0; transform: translateX(0) scale(0.95); }
            }
            @keyframes howMiniFileAppear {
              0%, 60% { opacity: 0; transform: scale(0); }
              70%, 90% { opacity: 1; transform: scale(1); }
              95%, 100% { opacity: 0; }
            }
          `}</style>
        </div>

        {/* 3 Quick Steps — matching original centered layout */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Започнете за 3 минути</h2>
            <p className="text-gray-500 mt-1">Три прости стъпки до пълен контрол</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Регистрирайте фирма', desc: 'Въведете ЕИК номера и данните се зареждат автоматично от Търговския регистър. Добавете колкото фирми желаете.', icon: Building2 },
              { step: '2', title: 'Качете фактури', desc: 'Drag & drop или изберете файлове — PDF, JPG, PNG, ZIP. Качете десетки фактури наведнъж. AI ги анализира за секунди.', icon: Upload },
              { step: '3', title: 'Готово!', desc: 'Фактурите са разпознати, сортирани по фирми и типове, и споделени с контрагентите ви. Свалете ги по всяко време.', icon: Check },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
                  <s.icon className="w-8 h-8 text-white" />
                </div>
                <div className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full text-sm font-bold mb-3">Стъпка {s.step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What you get — matching original indigo gradient bg */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8">
          <h3 className="text-xl font-extrabold text-gray-900 mb-4 text-center tracking-tight">Какво получавате?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Brain, text: 'AI разпознаване на дата, номер, издател, получател и суми от фактурите' },
              { icon: FolderSync, text: 'Автоматична организация по фирми и тип — покупки и продажби' },
              { icon: ArrowLeftRight, text: 'Споделяне с контрагенти — те получават известие и одобряват' },
              { icon: Download, text: 'Сваляне на фактури поотделно или групово с един клик' },
              { icon: Bell, text: 'Мигновени WebSocket известия + имейл нотификации за всяко събитие' },
              { icon: BarChart3, text: 'Пълна история и филтриране по всички полета' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-sm text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
