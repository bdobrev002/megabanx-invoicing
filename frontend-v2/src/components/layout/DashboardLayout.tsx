import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  Building2,
  Upload,
  Receipt,
  FileText,
  Bell,
  CreditCard,
} from 'lucide-react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { ROUTES } from '@/utils/constants'

const tabs = [
  { to: ROUTES.COMPANIES, label: 'Фирми', icon: Building2 },
  { to: ROUTES.UPLOAD, label: 'Качване', icon: Upload },
  { to: ROUTES.FILES, label: 'Фактури', icon: Receipt },
  { to: ROUTES.HISTORY, label: 'История', icon: FileText },
  { to: ROUTES.NOTIFICATIONS, label: 'Известия', icon: Bell },
  { to: ROUTES.BILLING, label: 'Абонамент', icon: CreditCard },
]

const stats = [
  { label: 'Фирми', value: '0', color: 'text-indigo-600' },
  { label: 'Фактури', value: '0', color: 'text-green-600' },
  { label: 'За обработка', value: '0', color: 'text-orange-600' },
  { label: 'Известия', value: '0', color: 'text-red-600' },
]

export default function DashboardLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Sidebar + content area side by side (same structure as LandingLayout) */}
      <div className="pt-[57px] flex">
        <Sidebar variant="landing" />

        <div className="flex-1 min-w-0">
          {/* Stats bar — connected row with dividers (matching original) */}
          <div className="bg-white border-b">
            <div className="px-4 py-3">
              <div className="flex border rounded-lg divide-x">
                {stats.map((s) => (
                  <div key={s.label} className="flex-1 py-3 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tab navigation — evenly spread (matching original) */}
          <div className="bg-white border-b shadow-sm">
            <div className="px-4">
              <div className="flex py-2">
                {tabs.map(({ to, label, icon: Icon }) => {
                  const active = location.pathname === to || location.pathname.startsWith(to + '/')
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      className={`flex-1 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                        active
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={14} />
                      {label}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main content */}
          <main className="p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
