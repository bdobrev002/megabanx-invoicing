import { Outlet, Link } from 'react-router-dom'
import LogoFull from '@/components/branding/LogoFull'
import { ROUTES } from '@/utils/constants'

export default function LandingLayout() {
  return (
    <div className="min-h-screen bg-white">
      {/* Landing Navbar */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link to={ROUTES.HOME}>
            <LogoFull />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to={ROUTES.HOW} className="text-sm text-gray-600 hover:text-gray-900">Как работи</Link>
            <Link to={ROUTES.PRICING} className="text-sm text-gray-600 hover:text-gray-900">Цени</Link>
            <Link to={ROUTES.FAQ} className="text-sm text-gray-600 hover:text-gray-900">FAQ</Link>
            <Link to={ROUTES.CONTACT} className="text-sm text-gray-600 hover:text-gray-900">Контакт</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to={ROUTES.LOGIN} className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Вход
            </Link>
            <Link
              to={ROUTES.REGISTER}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main>
        <Outlet />
      </main>

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
