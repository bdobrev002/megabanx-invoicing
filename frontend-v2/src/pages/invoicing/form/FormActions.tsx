import type { SyncMode } from '@/types/invoicing.types'
import Button from '@/components/ui/Button'

interface FormActionsProps {
  mode: 'create' | 'edit'
  syncMode: SyncMode
  delayMinutes: number
  submitting: boolean
  onCancel: () => void
  onSubmit: (status: 'issued' | 'draft') => void
  onSyncChange: (patch: { sync_mode?: SyncMode; delay_minutes?: number }) => void
  disabled?: boolean
}

/** SEC 11 — Issue/Draft/Save buttons + sync settings. */
export default function FormActions({
  mode,
  syncMode,
  delayMinutes,
  submitting,
  onCancel,
  onSubmit,
  onSyncChange,
  disabled,
}: FormActionsProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 pt-3">
      {/* Sync settings */}
      <div className="flex flex-wrap items-center gap-4 rounded-md bg-gray-50 px-3 py-2">
        <span className="text-sm font-semibold text-gray-700">Синхронизация:</span>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="inv_sync"
            value="manual"
            checked={syncMode === 'manual'}
            onChange={() => onSyncChange({ sync_mode: 'manual' })}
            disabled={disabled}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          Ръчно
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="inv_sync"
            value="immediate"
            checked={syncMode === 'immediate'}
            onChange={() => onSyncChange({ sync_mode: 'immediate' })}
            disabled={disabled}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          Веднага
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="inv_sync"
            value="delayed"
            checked={syncMode === 'delayed'}
            onChange={() => onSyncChange({ sync_mode: 'delayed' })}
            disabled={disabled}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          След
        </label>
        {syncMode === 'delayed' && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="1440"
              value={delayMinutes}
              onChange={(e) =>
                onSyncChange({ delay_minutes: parseInt(e.target.value, 10) || 30 })
              }
              disabled={disabled}
              className="h-7 w-16 rounded-md border border-gray-300 px-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <span className="text-sm text-gray-600">мин.</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Отказ
        </Button>
        {mode === 'create' && (
          <Button
            variant="secondary"
            onClick={() => onSubmit('draft')}
            disabled={disabled || submitting}
            loading={submitting}
          >
            Създай чернова
          </Button>
        )}
        <Button
          variant="primary"
          onClick={() => onSubmit('issued')}
          disabled={disabled || submitting}
          loading={submitting}
        >
          {mode === 'edit' ? 'Запази промените' : 'Създай фактура'}
        </Button>
      </div>
    </div>
  )
}
