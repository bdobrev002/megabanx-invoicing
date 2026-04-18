import LogoFull from '@/components/branding/LogoFull'

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <LogoFull />
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="text-xl font-bold text-gray-900">Потвърдете имейла си</h1>
          <p className="mt-4 text-sm text-gray-600">
            Изпратихме ви линк за потвърждение. Моля, проверете пощата си.
          </p>
        </div>
      </div>
    </div>
  )
}
