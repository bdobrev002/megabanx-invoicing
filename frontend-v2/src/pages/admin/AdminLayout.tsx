import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, ShieldCheck, CreditCard, ScrollText, Settings, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import LogoIcon from '@/components/branding/LogoIcon'
import { ROUTES } from '@/utils/constants'

const adminNav = [
  { to: ROUTES.ADMIN, label: 'Табло', icon: LayoutDashboard, exact: true },
  { to: ROUTES.ADMIN_USERS, label: 'Потребители', icon: Users },
  { to: ROUTES.ADMIN_COMPANIES, label: 'Фирми', icon: Building2 },
  { to: ROUTES.ADMIN_VERIFICATIONS, label: 'Верификации', icon: ShieldCheck },
  { to: ROUTES.ADMIN_BILLING, label: 'Фактуриране', icon: CreditCard },
  { to: ROUTES.ADMIN_LOGS, label: 'Логове', icon: ScrollText },
  { to: ROUTES.ADMIN_SETTINGS, label: 'Настройки', icon: Settings },
]

export default function AdminLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4">
          <LogoIcon size={28} />
          <span className="text-lg font-bold text-gray-900">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {adminNav.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} />
                {label}
              </NavLink>
            )
          })}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <Link
            to={ROUTES.DASHBOARD}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            Обратно
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
