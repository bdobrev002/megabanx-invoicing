import { useState, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'

const SUPPORTED_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif',
]

interface Props {
  onFiles: (files: File[]) => void
}

/**
 * Dashed-border drop zone matching the v1 Качване design:
 * large centered upload icon + headline + "PDF, JPG, PNG, TIFF" subline +
 * a solid blue "Изберете файлове" button inside the zone.
 */
export default function DropZone({ onFiles }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pickFiles = () => inputRef.current?.click()

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        SUPPORTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
      )
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
    <div
      className={`rounded-lg border-2 border-dashed bg-white px-6 py-14 text-center transition-colors ${
        dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center">
        <Upload size={56} className="text-gray-400" strokeWidth={1.5} />
        <p className="mt-4 text-base text-gray-800">
          Изберете файлове за качване или ги пуснете тук
        </p>
        <p className="mt-1 text-sm text-gray-500">PDF, JPG, PNG, TIFF</p>
        <button
          type="button"
          onClick={pickFiles}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <Upload size={16} />
          Изберете файлове
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_EXTENSIONS.join(',')}
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
