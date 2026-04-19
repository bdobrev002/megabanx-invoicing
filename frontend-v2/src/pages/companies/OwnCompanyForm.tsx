import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { companiesApi } from '@/api/companies.api'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import type { Company } from '@/types/company.types'

interface Props {
  company: Company | null
  onClose: () => void
  onSaved: () => void
}

export default function OwnCompanyForm({ company, onClose, onSaved }: Props) {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const setError = useUiStore((s) => s.setError)

  const [name, setName] = useState(company?.name ?? '')
  const [eik, setEik] = useState(company?.eik ?? '')
  const [vatNumber, setVatNumber] = useState(company?.vat_number ?? '')
  const [address, setAddress] = useState(company?.address ?? '')
  const [mol, setMol] = useState(company?.mol ?? '')
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
      const payload = { name, eik, vat_number: vatNumber, address, mol }
      if (company) {
        await companiesApi.update(profileId, company.id, payload)
      } else {
        await companiesApi.create(profileId, payload)
      }
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка при запис')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={company ? 'Редактиране на фирма' : 'Нова фирма'}
      size="lg"
    >
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
        <Input
          label="Наименование"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="ДДС номер"
          value={vatNumber}
          onChange={(e) => setVatNumber(e.target.value)}
          placeholder="BG123456789"
        />
        <Input
          label="Адрес"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Input
          label="МОЛ"
          value={mol}
          onChange={(e) => setMol(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отказ
          </Button>
          <Button type="submit" loading={saving}>
            {company ? 'Запази' : 'Създай'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
