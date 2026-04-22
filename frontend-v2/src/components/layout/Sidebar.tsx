import { NavLink, useLocation } from 'react-router-dom'
import {
  Building2,
  Upload,
  Receipt,
  FileText,
  Bell,
  CreditCard,
  ClipboardList,
  Settings as SettingsIcon,
  Home,
  Monitor,
  Camera,
  Shield,
  HelpCircle,
  Users2,
  MessageSquare,
  X,
} from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { ROUTES } from '@/utils/constants'

const dashboardItems = [
  { to: ROUTES.COMPANIES, label: 'Фирми', icon: Building2, color: 'text-indigo-500' },
  { to: ROUTES.UPLOAD, label: 'Качване', icon: Upload, color: 'text-green-500' },
  { to: ROUTES.FILES, label: 'Фактури', icon: Receipt, color: 'text-orange-500' },
  { to: ROUTES.HISTORY, label: 'История', icon: FileText, color: 'text-blue-500' },
  { to: ROUTES.INVOICING, label: 'Фактуриране', icon: ClipboardList, color: 'text-teal-500' },
  { to: ROUTES.NOTIFICATIONS, label: 'Известия', icon: Bell, color: 'text-rose-500' },
  { to: ROUTES.BILLING, label: 'Абонамент', icon: CreditCard, color: 'text-purple-500' },
  { to: ROUTES.SETTINGS, label: 'Настройки', icon: SettingsIcon, color: 'text-slate-600' },
]

const landingItems = [
  { to: ROUTES.HOME, label: 'За сайта', icon: Home },
  { to: ROUTES.HOW, label: 'Как работи', icon: Monitor },
  { to: ROUTES.SCREENSHOTS, label: 'ScreenShots', icon: Camera },
  { to: ROUTES.SECURITY, label: 'Сигурност', icon: Shield },
  { to: ROUTES.PRICING, label: 'Планове и цени', icon: CreditCard },
  { to: ROUTES.FAQ, label: 'Често задавани въпроси', icon: HelpCircle },
  { to: ROUTES.ABOUT_US, label: 'Кои сме ние', icon: Users2 },
  { to: ROUTES.CONTACT, label: 'Контакти', icon: MessageSquare },
]

interface SidebarProps {
  variant?: 'dashboard' | 'landing'
}

export default function Sidebar({ variant = 'dashboard' }: SidebarProps) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const location = useLocation()

  const items = variant === 'landing' ? landingItems : dashboardItems
  const isLanding = variant === 'landing'

  return (
    <>
      <aside
        className={`${
          isLanding
            ? 'hidden md:block w-64 bg-gray-50 border-r flex-shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto'
            : 'hidden md:block fixed top-[57px] left-0 w-52 h-[calc(100vh-57px)] bg-gray-50 border-r z-20 overflow-y-auto pt-3'
        }`}
      >
        <nav className={`space-y-1 ${isLanding ? 'p-4' : 'px-3'}`}>
          {items.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {label}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-20 pt-[49px]" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-64 h-full bg-white border-r overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm font-medium text-gray-500">Навигация</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-1 p-3">
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                >
                  <Icon size={16} className="flex-shrink-0" /> {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
