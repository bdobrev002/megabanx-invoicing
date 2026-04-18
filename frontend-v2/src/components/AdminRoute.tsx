import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

export default function AdminRoute() {
  const token = useAuthStore((s) => s.token)
  // TODO: check user.is_admin flag once backend provides it

  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <Outlet />
}
