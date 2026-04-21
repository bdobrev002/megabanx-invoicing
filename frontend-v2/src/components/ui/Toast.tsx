import { useEffect, useRef } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), duration)
    return () => clearTimeout(timer)
  }, [duration, message])

  const Icon = type === 'success' ? CheckCircle : AlertCircle
  const bg = type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  const text = type === 'success' ? 'text-green-800' : 'text-red-800'
  const iconColor = type === 'success' ? 'text-green-500' : 'text-red-500'

  return (
    <div className={`fixed right-4 top-4 z-[100] flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${bg}`}>
      <Icon size={20} className={iconColor} />
      <p className={`text-sm font-medium ${text}`}>{message}</p>
      <button onClick={onClose} className={`ml-2 rounded p-1 hover:bg-black/5 ${text}`}>
        <X size={16} />
      </button>
    </div>
  )
}
