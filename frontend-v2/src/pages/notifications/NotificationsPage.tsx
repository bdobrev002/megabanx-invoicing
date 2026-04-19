import { useState, useEffect, useCallback } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { Bell, CheckCheck } from 'lucide-react'
import { notificationsApi } from '@/api/notifications.api'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUiStore } from '@/stores/uiStore'
import NotificationList from './NotificationList'

export default function NotificationsPage() {
  const { notifications, setNotifications } = useNotificationStore()
  const setError = useUiStore((s) => s.setError)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const list = await notificationsApi.list()
      setNotifications(list)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане')
    } finally {
      setLoading(false)
    }
  }, [setNotifications, setError])

  useEffect(() => { fetch() }, [fetch])

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      await fetch()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner /></div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Известия</h1>
        {notifications.length > 0 && (
          <Button size="sm" variant="ghost" onClick={handleMarkAllRead}>
            <CheckCheck size={16} className="mr-1" /> Маркирай всички
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell size={48} className="text-gray-300" />
            <p className="mt-4 text-gray-500">Нямате нови известия</p>
          </div>
        </Card>
      ) : (
        <NotificationList notifications={notifications} onRefresh={fetch} />
      )}
    </div>
  )
}
