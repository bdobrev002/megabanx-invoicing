import { useState, useEffect } from 'react'
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
  const userName = useAuthStore((s) => s.user?.name) ?? ''
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
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h2 className="text-base md:text-lg font-semibold">
          Фирми в профил &ldquo;{userName}&rdquo;
        </h2>
        <button
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 self-start sm:self-auto"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} /> Добави фирма
        </button>
      </div>

      {companies.length === 0 && (
        <div className="py-12 text-center text-gray-400">
          Все още нямате добавени фирми.
        </div>
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
