import { Link } from 'react-router-dom'
import { Bell, Menu, LogOut, Home } from 'lucide-react'
import LogoFull from '@/components/branding/LogoFull'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { ROUTES } from '@/utils/constants'

export default function Navbar() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  return (
    <header className="fixed top-0 left-0 right-0 z-30 shadow-md" style={{ background: 'linear-gradient(to right, #0f172a, #1e293b)' }}>
      <div className="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button onClick={toggleSidebar} className="md:hidden p-1.5 text-gray-300 hover:text-white flex-shrink-0">
            <Menu size={20} />
          </button>
          <Link to={ROUTES.HOME} className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0">
            <LogoFull dark size="sm" />
          </Link>
          {user && (
            <>
              <span className="hidden md:inline text-gray-500">|</span>
              <span className="hidden md:inline text-sm font-medium text-white truncate">{user.name}</span>
              <span className="text-xs md:text-sm font-medium text-indigo-300 truncate">{user.email}</span>
            </>
          )}
        </div>

        {/* Desktop nav buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Link to={ROUTES.HOME} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition">
            <Home size={16} /> Начална страница
          </Link>
          <Link to={ROUTES.NOTIFICATIONS} className="relative inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <button onClick={logout} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition">
            <LogOut size={16} /> Изход
          </button>
        </div>

        {/* Mobile: compact buttons */}
        <div className="flex md:hidden items-center gap-1">
          <Link to={ROUTES.HOME} className="p-1.5 text-indigo-300 hover:text-white">
            <Home size={16} />
          </Link>
          <button onClick={logout} className="p-1.5 text-gray-400 hover:text-white">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
