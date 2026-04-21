import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { FolderOpen } from 'lucide-react'
import { filesApi } from '@/api/files.api'
import { useAuthStore } from '@/stores/authStore'
import { useFileStore } from '@/stores/fileStore'
import { useUiStore } from '@/stores/uiStore'
import { useWsRefresh } from '@/hooks/useWsRefresh'
import FileFilters from './FileFilters'
import FileList from './FileList'
import FileActions from './FileActions'

export default function FilesPage() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const { selectedFiles, clearSelection } = useFileStore()
  const setError = useUiStore((s) => s.setError)

  const [folders, setFolders] = useState<
    { name: string; subfolders: { name: string; file_count: number }[] }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchFolders = useCallback(async () => {
    if (!profileId) return
    try {
      const data = await filesApi.getFolderStructure(profileId)
      setFolders(data.folders ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане')
    } finally {
      setLoading(false)
    }
  }, [profileId, setError])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchFolders()
      if (cancelled) return
    }
    load()
    return () => { cancelled = true }
  }, [fetchFolders])

  // Refresh on WebSocket events (debounced, see Devin Review on PR #8).
  useWsRefresh(fetchFolders)

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return
    for (const id of selectedFiles) {
      try {
        await filesApi.remove(profileId, id)
      } catch {
        /* skip individual errors */
      }
    }
    clearSelection()
    fetchFolders()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  const filtered = folders.filter((f) => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter) {
      return f.subfolders.some((sf) => sf.name === typeFilter && sf.file_count > 0)
    }
    return true
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Файлове</h1>
        {selectedFiles.size > 0 && (
          <FileActions
            selectedCount={selectedFiles.size}
            onDelete={handleDeleteSelected}
          />
        )}
      </div>

      <FileFilters
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      {filtered.length === 0 ? (
        <Card className="mt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen size={48} className="text-gray-300" />
            <p className="mt-4 text-gray-500">Няма файлове за показване</p>
          </div>
        </Card>
      ) : (
        <FileList folders={filtered} />
      )}
    </div>
  )
}
