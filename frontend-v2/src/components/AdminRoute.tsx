import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'
import Spinner from '@/components/ui/Spinner'

export default function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  // Show spinner while AuthInitializer fetches user via authApi.me()
  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user.is_admin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
