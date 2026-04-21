import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function VatConfirmDialog({ open, onClose, onConfirm }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Потвърждение за ДДС" size="sm">
      <p className="text-sm text-gray-600">
        Цените са без включен ДДС (20%). Крайната сума ще бъде начислена с ДДС при плащане.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Отказ</Button>
        <Button onClick={onConfirm}>Продължи</Button>
      </div>
    </Modal>
  )
}
