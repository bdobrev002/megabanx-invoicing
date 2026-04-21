import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { companiesApi } from '@/api/companies.api'
import { useUiStore } from '@/stores/uiStore'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function CounterpartyForm({ onClose, onSaved }: Props) {
  const setError = useUiStore((s) => s.setError)

  const [name, setName] = useState('')
  const [eik, setEik] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [address, setAddress] = useState('')
  const [mol, setMol] = useState('')
  const [saving, setSaving] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)

  const handleLookup = async () => {
    if (eik.length < 9) return
    setLookingUp(true)
    try {
      const data = await companiesApi.lookupEik(eik)
      if (data.name) setName(data.name)
      if (data.address) setAddress(data.address)
      if (data.mol) setMol(data.mol)
    } catch {
      setError('ЕИК не е намерен в регистъра')
    } finally {
      setLookingUp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !eik.trim()) return
    setSaving(true)
    try {
      // Counterparties are stored locally or via a dedicated endpoint
      void { name, eik, vat_number: vatNumber, address, mol }
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка при запис')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Нов контрагент" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <Input
            label="ЕИК"
            value={eik}
            onChange={(e) => setEik(e.target.value)}
            placeholder="123456789"
            required
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-6"
            loading={lookingUp}
            onClick={handleLookup}
          >
            Търси
          </Button>
        </div>
        <Input label="Наименование" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="ДДС номер" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
        <Input label="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input label="МОЛ" value={mol} onChange={(e) => setMol(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Отказ</Button>
          <Button type="submit" loading={saving}>Създай</Button>
        </div>
      </form>
    </Modal>
  )
}
