import { useEffect, useState } from 'react'
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
import { companiesApi } from '@/api/companies.api'
import { notificationsApi } from '@/api/notifications.api'
import { invoicingApi } from '@/api/invoicing.api'
import { useAuthStore } from '@/stores/authStore'
import { useCompanyStore } from '@/stores/companyStore'
import { useNotificationStore } from '@/stores/notificationStore'

const tabs = [
  { to: ROUTES.COMPANIES, label: 'Фирми', icon: Building2 },
  { to: ROUTES.UPLOAD, label: 'Качване', icon: Upload },
  { to: ROUTES.FILES, label: 'Фактури', icon: Receipt },
  { to: ROUTES.HISTORY, label: 'История', icon: FileText },
  { to: ROUTES.NOTIFICATIONS, label: 'Известия', icon: Bell },
  { to: ROUTES.BILLING, label: 'Абонамент', icon: CreditCard },
]

export default function DashboardLayout() {
  const location = useLocation()
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const invoiceCount = useAuthStore((s) => s.user?.subscription?.usage?.invoices) ?? 0
  const companies = useCompanyStore((s) => s.companies)
  const setCompanies = useCompanyStore((s) => s.setCompanies)
  const notifications = useNotificationStore((s) => s.notifications)
  const setNotifications = useNotificationStore((s) => s.setNotifications)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const [pendingCount, setPendingCount] = useState(0)

  // Load shared stats data once per profile so the sticky header counters
  // reflect reality across all dashboard pages (not just CompaniesPage).
  useEffect(() => {
    if (!profileId) return
    let cancelled = false
    void (async () => {
      try {
        const [cs, ns, inc] = await Promise.all([
          companiesApi.list(profileId),
          notificationsApi.list(),
          invoicingApi.getIncomingCrossCopies(profileId).catch(() => []),
        ])
        if (cancelled) return
        setCompanies(cs)
        setNotifications(ns)
        setUnreadCount(ns.length)
        setPendingCount(inc.length)
      } catch {
        /* ignore — stats remain at previous values */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profileId, setCompanies, setNotifications, setUnreadCount])

  const stats = [
    { label: 'Фирми', value: String(companies.length), color: 'text-indigo-600' },
    { label: 'Фактури', value: String(invoiceCount), color: 'text-green-600' },
    { label: 'За обработка', value: String(pendingCount), color: 'text-orange-600' },
    { label: 'Известия', value: String(notifications.length), color: 'text-red-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Sidebar + content area side by side (same structure as LandingLayout) */}
      <div className="pt-[57px] flex">
        <Sidebar variant="dashboard" />

        <div className="flex-1 min-w-0 md:ml-52">
          {/* Stats + Tabs sticky header (matching original: sticky bg-gray-50 z-10) */}
          <div className="sticky top-[57px] z-10 bg-gray-50">
            {/* Stats row */}
            <div className="max-w-7xl mx-auto px-2 md:px-4 mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="bg-white rounded-lg p-3 shadow-sm">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tab navigation */}
            <div className="max-w-7xl mx-auto px-2 md:px-4 mt-3 md:mt-4 pb-3">
              <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">
                {tabs.map(({ to, label, icon: Icon }) => {
                  const active = location.pathname === to || location.pathname.startsWith(to + '/')
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      className={`flex-1 min-w-0 flex items-center justify-center gap-1 md:gap-1.5 px-2 md:px-3 py-2 text-xs md:text-sm rounded-md transition whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
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
          <main className="max-w-7xl mx-auto px-2 md:px-4 py-3 md:py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
