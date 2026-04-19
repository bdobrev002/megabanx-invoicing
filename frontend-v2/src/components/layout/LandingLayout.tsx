import { Outlet, Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import LogoFull from '@/components/branding/LogoFull'
import Sidebar from './Sidebar'
import { useUiStore } from '@/stores/uiStore'
import { ROUTES } from '@/utils/constants'

export default function LandingLayout() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  return (
    <div className="min-h-screen bg-white">
      {/* Landing Navbar — dark blue gradient matching megabanx.com */}
      <header className="fixed top-0 left-0 right-0 z-30 shadow-md" style={{ background: 'linear-gradient(to right, #0f172a, #1e293b)' }}>
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={toggleSidebar} className="md:hidden p-1.5 text-gray-300 hover:text-white">
              <Menu size={20} />
            </button>
            <Link to={ROUTES.HOME} className="flex items-center gap-2 hover:opacity-80 transition">
              <LogoFull dark size="sm" />
            </Link>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Link to={ROUTES.LOGIN} className="px-3 py-1.5 text-sm font-medium text-indigo-300 hover:text-white transition">
              Вход
            </Link>
            <Link
              to={ROUTES.REGISTER}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </header>

      {/* Content area with sidebar */}
      <div className="flex pt-[57px]">
        <Sidebar variant="landing" />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Footer — dark bg matching original megabanx.com */}
      <footer className="py-6 px-4 bg-gray-900 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none"><rect x="2" y="2" width="44" height="44" rx="12" fill="url(#gLogoF)"/><rect x="16" y="12" width="16" height="20" rx="2" fill="white" opacity="0.9"/><line x1="19" y1="18" x2="29" y2="18" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round"/><line x1="19" y1="22" x2="27" y2="22" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/><circle cx="38" cy="8" r="5" fill="#f97316"/><path d="M38 5.5v5M35.5 8h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><defs><linearGradient id="gLogoF" x1="2" y1="2" x2="46" y2="46"><stop stopColor="#4f46e5"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs></svg>
            <span className="text-sm font-bold text-white">Mega<span className="text-indigo-400">Ban</span><span className="text-orange-400 font-extrabold">x</span></span>
          </div>
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} MegaBanx. Всички права запазени.</p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <Link to={ROUTES.TERMS} className="hover:text-white transition">Общи условия</Link>
            <span className="text-gray-600">|</span>
            <Link to={ROUTES.PRIVACY} className="hover:text-white transition">Поверителност</Link>
            <span className="text-gray-600">|</span>
            <Link to={ROUTES.COOKIES} className="hover:text-white transition">Бисквитки</Link>
            <span className="text-gray-600">|</span>
            <a href="mailto:info@megabanx.com" className="hover:text-white transition">info@megabanx.com</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
