import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { Plus } from 'lucide-react'
import { companiesApi } from '@/api/companies.api'
import { sharingApi } from '@/api/sharing.api'
import { useAuthStore } from '@/stores/authStore'
import { useCompanyStore } from '@/stores/companyStore'
import { useUiStore } from '@/stores/uiStore'
import { useDialogStore } from '@/stores/dialogStore'
import type { Company } from '@/types/company.types'
import CompanyCard from './CompanyCard'
import OwnCompanyForm from './OwnCompanyForm'
import SharedCompanies from './SharedCompanies'

export default function CompaniesPage() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const { companies, setCompanies, sharedCompanies, setSharedCompanies } =
    useCompanyStore()
  const setError = useUiStore((s) => s.setError)
  const showConfirm = useDialogStore((s) => s.showConfirm)

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)

  const fetchCompanies = async () => {
    if (!profileId) return
    try {
      const list = await companiesApi.list(profileId)
      setCompanies(list)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане')
    }
  }

  const fetchShared = async () => {
    try {
      const list = await sharingApi.getSharedWithMe()
      setSharedCompanies(list)
    } catch {
      /* shared endpoint might 404 if user has none */
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchCompanies(), fetchShared()])
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Изтриване на фирма',
      message: 'Сигурни ли сте, че искате да изтриете тази фирма?',
      confirmLabel: 'Изтрий',
      cancelLabel: 'Отказ',
    })
    if (!confirmed) return
    try {
      await companiesApi.remove(profileId, id)
      setCompanies(companies.filter((c) => c.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при изтриване')
    }
  }

  const handleEdit = (c: Company) => {
    setEditingCompany(c)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingCompany(null)
  }

  const handleSaved = () => {
    handleFormClose()
    fetchCompanies()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Фирми{' '}
          <span className="text-base font-normal text-gray-400">
            ({companies.length})
          </span>
        </h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={16} className="mr-1" /> Добави фирма
        </Button>
      </div>

      {companies.length === 0 && (
        <Card className="mt-6">
          <p className="py-12 text-center text-gray-400">
            Все още нямате добавени фирми.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {companies.map((c) => (
          <CompanyCard
            key={c.id}
            company={c}
            onEdit={() => handleEdit(c)}
            onDelete={() => handleDelete(c.id)}
          />
        ))}
      </div>

      {sharedCompanies.length > 0 && (
        <SharedCompanies companies={sharedCompanies} onRefresh={fetchShared} />
      )}

      {showForm && (
        <OwnCompanyForm
          company={editingCompany}
          onClose={handleFormClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
