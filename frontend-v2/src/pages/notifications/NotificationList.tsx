import type { Notification } from '@/types/notification.types'
import NotificationItem from './NotificationItem'

interface Props {
  notifications: Notification[]
  onRefresh: () => void
}

export default function NotificationList({ notifications, onRefresh }: Props) {
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} onRefresh={onRefresh} />
      ))}
    </ul>
  )
}
