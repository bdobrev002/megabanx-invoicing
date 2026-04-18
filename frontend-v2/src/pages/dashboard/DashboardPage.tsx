import { Building2, FileText, Upload, Bell } from 'lucide-react'
import Card from '@/components/ui/Card'

const stats = [
  { label: 'Фирми', value: '—', icon: Building2, color: 'text-blue-600 bg-blue-100' },
  { label: 'Фактури', value: '—', icon: FileText, color: 'text-green-600 bg-green-100' },
  { label: 'Качени файлове', value: '—', icon: Upload, color: 'text-purple-600 bg-purple-100' },
  { label: 'Известия', value: '—', icon: Bell, color: 'text-orange-600 bg-orange-100' },
]

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Табло</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  )
}
