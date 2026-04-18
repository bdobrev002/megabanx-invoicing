import Card from '@/components/ui/Card'
import { Bell } from 'lucide-react'

export default function NotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Известия</h1>
      <Card className="mt-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell size={48} className="text-gray-300" />
          <p className="mt-4 text-gray-500">Нямате нови известия</p>
        </div>
      </Card>
    </div>
  )
}
