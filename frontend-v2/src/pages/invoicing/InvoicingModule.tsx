import Card from '@/components/ui/Card'
import { FileText } from 'lucide-react'

export default function InvoicingModule() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Фактуриране</h1>
      <Card className="mt-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={48} className="text-gray-300" />
          <p className="mt-4 text-gray-500">Модулът за фактуриране ще бъде активиран във Фаза 5</p>
        </div>
      </Card>
    </div>
  )
}
