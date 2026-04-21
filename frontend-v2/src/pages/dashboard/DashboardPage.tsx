import { useState, useEffect } from 'react'
import { Building2, FileText, Upload, Bell } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import { companiesApi } from '@/api/companies.api'
import { notificationsApi } from '@/api/notifications.api'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import StatsCards from './StatsCards'
import TabNavigation from './TabNavigation'
import type { StatItem } from './StatsCards'

export default function DashboardPage() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const subscription = useAuthStore((s) => s.user?.subscription)
  const { setNotifications, setUnreadCount } = useNotificationStore()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatItem[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!profileId) return
      try {
        const [companies, notifications] = await Promise.all([
          companiesApi.list(profileId),
          notificationsApi.list(),
        ])
        if (cancelled) return
        setNotifications(notifications)
        setUnreadCount(notifications.length)

        const invoiceCount = subscription?.usage?.invoices ?? 0

        setStats([
          { label: 'Фирми', value: companies.length, icon: Building2, color: 'text-blue-600 bg-blue-100' },
          { label: 'Фактури', value: invoiceCount, icon: FileText, color: 'text-green-600 bg-green-100' },
          { label: 'Качени файлове', value: '—', icon: Upload, color: 'text-purple-600 bg-purple-100' },
          { label: 'Известия', value: notifications.length, icon: Bell, color: 'text-orange-600 bg-orange-100' },
        ])
      } catch {
        if (cancelled) return
        setStats([
          { label: 'Фирми', value: '—', icon: Building2, color: 'text-blue-600 bg-blue-100' },
          { label: 'Фактури', value: '—', icon: FileText, color: 'text-green-600 bg-green-100' },
          { label: 'Качени файлове', value: '—', icon: Upload, color: 'text-purple-600 bg-purple-100' },
          { label: 'Известия', value: '—', icon: Bell, color: 'text-orange-600 bg-orange-100' },
        ])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner /></div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Табло</h1>
      <div className="mt-6">
        <StatsCards stats={stats} />
      </div>
      <TabNavigation />
    </div>
  )
}
