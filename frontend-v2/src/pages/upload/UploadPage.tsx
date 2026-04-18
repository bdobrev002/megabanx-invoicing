import Card from '@/components/ui/Card'
import { Upload } from 'lucide-react'

export default function UploadPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Качване на файлове</h1>
      <Card className="mt-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <Upload size={32} className="text-blue-600" />
          </div>
          <p className="mt-4 text-lg font-medium text-gray-900">Плъзнете файлове тук</p>
          <p className="mt-1 text-sm text-gray-500">или натиснете за да изберете PDF файлове</p>
        </div>
      </Card>
    </div>
  )
}
