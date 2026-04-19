import Card from '@/components/ui/Card'

interface Props {
  current: number
  total: number
}

export default function ProcessingProgress({ current, total }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <Card>
      <div className="py-8 text-center">
        <p className="text-lg font-medium text-gray-900">
          Качване на файлове... {current}/{total}
        </p>
        <div className="mx-auto mt-4 h-3 w-64 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">{pct}%</p>
      </div>
    </Card>
  )
}
