import { Link } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import LogoFull from '@/components/branding/LogoFull'
import IconButton from '@/components/ui/IconButton'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { ROUTES } from '@/utils/constants'

export default function Navbar() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <IconButton label="Toggle menu" className="lg:hidden" onClick={toggleSidebar}>
          <Menu size={20} />
        </IconButton>
        <Link to={ROUTES.DASHBOARD}>
          <LogoFull />
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link to={ROUTES.NOTIFICATIONS} className="relative">
          <IconButton label="Notifications">
            <Bell size={20} />
          </IconButton>
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {user && (
          <div className="ml-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-sm font-medium text-gray-700 sm:block">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  )
}
