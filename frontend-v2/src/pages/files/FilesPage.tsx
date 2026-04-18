import Card from '@/components/ui/Card'
import { FolderOpen } from 'lucide-react'

export default function FilesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Файлове</h1>
      <Card className="mt-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen size={48} className="text-gray-300" />
          <p className="mt-4 text-gray-500">Няма файлове за показване</p>
        </div>
      </Card>
    </div>
  )
}
