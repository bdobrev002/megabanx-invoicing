import Card from '@/components/ui/Card'
import type { LucideIcon } from 'lucide-react'

export interface StatItem {
  label: string
  value: string | number
  icon: LucideIcon
  color: string
}

interface Props {
  stats: StatItem[]
}

export default function StatsCards({ stats }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
              <Icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
