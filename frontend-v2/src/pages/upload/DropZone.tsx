import { useState, useRef, useCallback } from 'react'
import Card from '@/components/ui/Card'
import { Upload } from 'lucide-react'

const SUPPORTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif']

interface Props {
  onFiles: (files: File[]) => void
}

export default function DropZone({ onFiles }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files).filter((f) => SUPPORTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)))
      if (files.length > 0) onFiles(files)
    },
    [onFiles],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFiles(files)
    e.target.value = ''
  }

  return (
    <Card
      className={`cursor-pointer transition-colors ${dragOver ? 'border-indigo-400 bg-indigo-50' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
          <Upload size={32} className="text-blue-600" />
        </div>
        <p className="mt-4 text-lg font-medium text-gray-900">
          Плъзнете файлове тук
        </p>
        <p className="mt-1 text-sm text-gray-500">
          или натиснете за да изберете PDF или снимки (JPG/PNG/TIFF/WEBP)
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_EXTENSIONS.join(',')}
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </Card>
  )
}
