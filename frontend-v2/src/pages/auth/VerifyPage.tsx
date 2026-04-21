import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import LogoFull from '@/components/branding/LogoFull'
import { ROUTES } from '@/utils/constants'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth.api'

export default function VerifyPage() {
  const navigate = useNavigate()
  const {
    authEmail, authCode, setAuthCode,
    setUser, setToken, success,
  } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)
    setAuthCode(newDigits.join(''))

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newDigits = [...digits]
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i]
    }
    setDigits(newDigits)
    setAuthCode(newDigits.join(''))
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  const verifyCode = async (code: string) => {
    if (code.length !== 6) return
    setLoading(true)
    setLocalError(null)
    try {
      const result = await authApi.verify(authEmail.trim(), code)
      setToken(result.token)
      setUser(result.user)
      navigate(ROUTES.DASHBOARD)
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Невалиден код')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    void verifyCode(digits.join(''))
  }

  // Auto-submit when all 6 digits entered
  const submittedRef = useRef<string | null>(null)
  useEffect(() => {
    if (authCode.length === 6 && !loading && submittedRef.current !== authCode) {
      submittedRef.current = authCode
      void verifyCode(authCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authCode, loading])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <LogoFull />
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Потвърждение</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Въведете 6-цифрения код, изпратен на <strong className="text-gray-700">{authEmail || 'вашия имейл'}</strong>
          </p>

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {localError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {localError}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-11 h-13 text-center text-xl font-bold rounded-xl border border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || digits.join('').length !== 6}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? 'Проверяване...' : 'Потвърди'}
            </button>
          </form>

          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="mt-4 flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition w-full"
          >
            <ArrowLeft className="w-4 h-4" /> Обратно към вход
          </button>
        </div>
      </div>
    </div>
  )
}
