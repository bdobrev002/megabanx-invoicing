import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

export default function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user && !user.is_admin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
