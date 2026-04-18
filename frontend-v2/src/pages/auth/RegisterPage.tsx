import { Link } from 'react-router-dom'
import LogoFull from '@/components/branding/LogoFull'
import { ROUTES } from '@/utils/constants'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <LogoFull />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Регистрация</h1>
          <p className="mt-1 text-sm text-gray-500">Създайте нов акаунт</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Име"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Имейл"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Парола"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Регистрация
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Вече имате акаунт?{' '}
            <Link to={ROUTES.LOGIN} className="font-medium text-blue-600 hover:text-blue-700">
              Вход
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
