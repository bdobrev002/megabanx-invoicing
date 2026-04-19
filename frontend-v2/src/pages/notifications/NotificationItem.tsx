import Button from '@/components/ui/Button'
import { Check, FileText, AlertCircle, Info } from 'lucide-react'
import { notificationsApi } from '@/api/notifications.api'
import { useUiStore } from '@/stores/uiStore'
import { formatDate } from '@/utils/formatters'
import type { Notification } from '@/types/notification.types'

interface Props {
  notification: Notification
  onRefresh: () => void
}

const iconMap: Record<string, typeof Info> = {
  error: AlertCircle,
  file: FileText,
  info: Info,
}

export default function NotificationItem({ notification, onRefresh }: Props) {
  const setError = useUiStore((s) => s.setError)
  const Icon = iconMap[notification.type] ?? Info

  const handleMarkRead = async () => {
    try {
      await notificationsApi.markRead(notification.id)
      onRefresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка')
    }
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Icon size={18} className="mt-0.5 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
        <p className="text-sm text-gray-600">{notification.message}</p>
        <p className="mt-1 text-xs text-gray-400">
          {formatDate(notification.timestamp)}
          {notification.filename && ` — ${notification.filename}`}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={handleMarkRead} title="Маркирай като прочетено">
        <Check size={14} />
      </Button>
    </li>
  )
}
