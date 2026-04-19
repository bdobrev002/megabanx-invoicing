import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Sparkles } from 'lucide-react'
import { billingApi } from '@/api/billing.api'
import { useUiStore } from '@/stores/uiStore'

export default function TrialActivation() {
  const setError = useUiStore((s) => s.setError)

  const handleActivate = async () => {
    try {
      await billingApi.activateTrial()
      window.location.reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при активиране')
    }
  }

  return (
    <Card className="mt-4 border-indigo-200 bg-indigo-50">
      <div className="flex items-center gap-4">
        <Sparkles size={24} className="shrink-0 text-indigo-500" />
        <div className="flex-1">
          <p className="font-semibold text-indigo-900">Пробен период</p>
          <p className="text-sm text-indigo-700">
            Активирайте безплатен пробен период и изпробвайте всички функции.
          </p>
        </div>
        <Button size="sm" onClick={handleActivate}>Активирай</Button>
      </div>
    </Card>
  )
}
