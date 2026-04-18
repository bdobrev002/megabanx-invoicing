import Card from '@/components/ui/Card'
import { CreditCard } from 'lucide-react'

export default function BillingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Абонамент</h1>
      <Card className="mt-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard size={48} className="text-gray-300" />
          <p className="mt-4 text-gray-500">Информация за абонамента ще бъде заредена тук</p>
        </div>
      </Card>
    </div>
  )
}
