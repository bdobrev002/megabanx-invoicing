import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, User, Loader2, AlertCircle, UserPlus, CheckSquare, Square } from 'lucide-react'
import LogoFull from '@/components/branding/LogoFull'
import { ROUTES } from '@/utils/constants'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth.api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const {
    authEmail, setAuthEmail,
    authName, setAuthName,
    authTosAccepted, setAuthTosAccepted,
    setSuccess, setError,
  } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authName.trim() || !authEmail.trim()) return
    if (!authTosAccepted) {
      setLocalError('Трябва да приемете Общите условия за да се регистрирате')
      return
    }
    setLoading(true)
    setLocalError(null)

    try {
      await authApi.register(authName.trim(), authEmail.trim(), authTosAccepted)
      setSuccess('Код за вход е изпратен на имейла ви.')
      setError(null)
      navigate(ROUTES.VERIFY)
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Грешка при регистрация')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <LogoFull />
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Регистрация</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">Създайте безплатен акаунт в MegaBanx</p>

          {localError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {localError}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Вашето име</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Имейл адрес</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAuthTosAccepted(!authTosAccepted)}
              className="flex items-start gap-2 text-left"
            >
              {authTosAccepted
                ? <CheckSquare className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                : <Square className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              }
              <span className="text-sm text-gray-600">
                Приемам{' '}
                <span className="text-indigo-600 font-medium">Общите условия</span>
                {' '}на MegaBanx
              </span>
            </button>

            <button
              type="submit"
              disabled={loading || !authName.trim() || !authEmail.trim() || !authTosAccepted}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? 'Регистриране...' : 'Регистрация'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Вече имате акаунт?{' '}
            <Link to={ROUTES.LOGIN} className="font-medium text-indigo-600 hover:text-indigo-700">
              Вход
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
