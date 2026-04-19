import { useNavigate, useLocation } from 'react-router-dom'
import {
  Building2,
  Upload,
  FolderOpen,
  History,
  Bell,
  CreditCard,
} from 'lucide-react'

const tabs = [
  { path: '/companies', label: 'Фирми', icon: Building2 },
  { path: '/upload', label: 'Качване', icon: Upload },
  { path: '/files', label: 'Файлове', icon: FolderOpen },
  { path: '/history', label: 'История', icon: History },
  { path: '/notifications', label: 'Известия', icon: Bell },
  { path: '/billing', label: 'Абонамент', icon: CreditCard },
]

export default function TabNavigation() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
              active
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Icon size={20} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
