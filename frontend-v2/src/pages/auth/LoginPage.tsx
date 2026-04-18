import { Link } from 'react-router-dom'
import LogoFull from '@/components/branding/LogoFull'
import { ROUTES } from '@/utils/constants'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <LogoFull />
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="text-xl font-bold text-gray-900">Вход</h1>
          <p className="mt-1 text-sm text-gray-500">Влезте в профила си</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Имейл"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="password"
              placeholder="Парола"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Вход
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
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
