import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

export default function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  // Block access while user is still loading (user is null but token exists)
  if (!user) {
    return null
  }

  if (!user.is_admin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
