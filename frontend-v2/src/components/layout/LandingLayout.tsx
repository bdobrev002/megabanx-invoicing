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

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <LogoFull />
            <div className="flex gap-6 text-sm text-gray-500">
              <Link to={ROUTES.TERMS} className="hover:text-gray-700">Условия</Link>
              <Link to={ROUTES.PRIVACY} className="hover:text-gray-700">Поверителност</Link>
              <Link to={ROUTES.COOKIES} className="hover:text-gray-700">Бисквитки</Link>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} MegaBanx. Всички права запазени.
          </p>
        </div>
      </footer>
    </div>
  )
}
