import Card from '@/components/ui/Card'
import { History } from 'lucide-react'

export default function HistoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">История</h1>
      <Card className="mt-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <History size={48} className="text-gray-300" />
          <p className="mt-4 text-gray-500">Няма записи в историята</p>
        </div>
      </Card>
    </div>
  )
}
