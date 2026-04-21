import { useEffect, useRef } from 'react'
import { X, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { useDialogStore } from '@/stores/dialogStore'

const variantConfig = {
  confirm: {
    icon: Info,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  },
  alert: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  },
  prompt: {
    icon: Info,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  },
  error: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
  },
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    confirmBtn: 'bg-green-600 hover:bg-green-700 text-white',
  },
  loading: {
    icon: Loader2,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    confirmBtn: '',
  },
}

export default function DialogProvider() {
  const {
    open,
    variant,
    title,
    message,
    confirmLabel,
    cancelLabel,
    promptValue,
    promptPlaceholder,
    processing,
    resolve,
    setPromptValue,
  } = useDialogStore()

  const inputRef = useRef<HTMLInputElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  // Focus management
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      if (variant === 'prompt' && inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      } else if (confirmBtnRef.current) {
        confirmBtnRef.current.focus()
      }
    })
  }, [open, variant])

  // Escape key handler
  useEffect(() => {
    if (!open || variant === 'loading') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (variant === 'confirm' || variant === 'prompt') {
          resolve(variant === 'prompt' ? null : false)
        } else {
          resolve(true)
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, variant, resolve])

  if (!open) return null

  const config = variantConfig[variant]
  const IconComponent = config.icon

  const handleConfirm = () => {
    if (variant === 'prompt') {
      resolve(promptValue ?? '')
    } else if (variant === 'confirm') {
      resolve(true)
    } else {
      resolve(true)
    }
  }

  const handleCancel = () => {
    if (variant === 'prompt') {
      resolve(null)
    } else {
      resolve(false)
    }
  }

  const handleBackdropClick = () => {
    if (variant === 'loading') return
    handleCancel()
  }

  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close button (not for loading) */}
        {variant !== 'loading' && (
          <button
            onClick={handleCancel}
            className="absolute top-3 right-3 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>
        )}

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
              <IconComponent
                size={24}
                className={`${config.iconColor} ${variant === 'loading' ? 'animate-spin' : ''}`}
              />
            </div>
          </div>

          {/* Title */}
          {title && (
            <h3 className="text-center text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
          )}

          {/* Message */}
          <p className="text-center text-sm text-gray-600 leading-relaxed">
            {message}
          </p>

          {/* Prompt input */}
          {variant === 'prompt' && (
            <input
              ref={inputRef}
              type="text"
              value={promptValue ?? ''}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder={promptPlaceholder}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
            />
          )}

          {/* Buttons */}
          {variant !== 'loading' && (
            <div className={`mt-6 flex gap-3 ${variant === 'confirm' || variant === 'prompt' ? 'justify-center' : 'justify-center'}`}>
              {(variant === 'confirm' || variant === 'prompt') && (
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
              )}
              <button
                ref={confirmBtnRef}
                onClick={handleConfirm}
                disabled={processing}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${config.confirmBtn}`}
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Зареждане...
                  </span>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
