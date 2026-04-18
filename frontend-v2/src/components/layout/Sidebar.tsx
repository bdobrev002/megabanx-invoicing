import { NavLink, useLocation } from 'react-router-dom'
import {
  Building2,
  Upload,
  FolderOpen,
  History,
  Bell,
  CreditCard,
  FileText,
  LogOut,
  X,
} from 'lucide-react'
import LogoIcon from '@/components/branding/LogoIcon'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

const navItems = [
  { to: ROUTES.COMPANIES, label: 'Фирми', icon: Building2 },
  { to: ROUTES.UPLOAD, label: 'Качване', icon: Upload },
  { to: ROUTES.FILES, label: 'Файлове', icon: FolderOpen },
  { to: ROUTES.HISTORY, label: 'История', icon: History },
  { to: ROUTES.INVOICING, label: 'Фактуриране', icon: FileText },
  { to: ROUTES.NOTIFICATIONS, label: 'Известия', icon: Bell },
  { to: ROUTES.BILLING, label: 'Абонамент', icon: CreditCard },
]

export default function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <LogoIcon size={28} />
            <span className="text-lg font-bold text-gray-900">MegaBanx</span>
          </div>
          <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/')
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} />
                {label}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut size={20} />
            Изход
          </button>
        </div>
      </aside>
    </>
  )
}
