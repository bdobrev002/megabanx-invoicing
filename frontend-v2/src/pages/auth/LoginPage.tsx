import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Loader2, AlertCircle, LogIn, CheckSquare, Square, User } from 'lucide-react'
import LogoFull from '@/components/branding/LogoFull'
import { ROUTES } from '@/utils/constants'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth.api'

export default function LoginPage() {
  const navigate = useNavigate()
  const {
    authEmail, setAuthEmail,
    authName, setAuthName,
    authTosAccepted, setAuthTosAccepted,
    authNeedsTos, setAuthNeedsTos,
    setError, setSuccess,
  } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail.trim()) return
    setLoading(true)
    setLocalError(null)

    try {
      const result = await authApi.login(authEmail.trim(), authTosAccepted, authName.trim() || undefined)
      if (result.needs_tos) {
        setAuthNeedsTos(true)
        setLocalError(result.message || 'Моля, приемете Общите условия и въведете името си.')
        setLoading(false)
        return
      }
      setSuccess('Код за вход е изпратен на имейла ви.')
      setError(null)
      navigate(ROUTES.VERIFY)
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Грешка при вход')
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
            <LogIn className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Вход</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">Въведете имейла си, за да получите код за вход</p>

          {localError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {localError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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

            {authNeedsTos && (
              <>
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
              </>
            )}

            <button
              type="submit"
              disabled={loading || !authEmail.trim()}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {loading ? 'Изпращане...' : 'Изпрати код за вход'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Нямате акаунт?{' '}
            <Link to={ROUTES.REGISTER} className="font-medium text-indigo-600 hover:text-indigo-700">
              Регистрация
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
