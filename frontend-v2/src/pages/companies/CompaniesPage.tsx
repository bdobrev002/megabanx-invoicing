import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Plus } from 'lucide-react'

export default function CompaniesPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Фирми</h1>
        <Button size="sm"><Plus size={16} className="mr-1" /> Добави фирма</Button>
      </div>
      <Card className="mt-6">
        <p className="text-center text-gray-400 py-12">
          Все още нямате добавени фирми. Натиснете &ldquo;Добави фирма&rdquo; за да започнете.
        </p>
      </Card>
    </div>
  )
}
