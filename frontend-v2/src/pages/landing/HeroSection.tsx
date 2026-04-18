import { Link } from 'react-router-dom'
import { ROUTES } from '@/utils/constants'

export default function HeroSection() {
  return (
    <section id="hero" className="bg-gradient-to-b from-blue-50 to-white py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Електронно фактуриране
          <span className="block text-blue-600">за българския бизнес</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Качвайте, обработвайте и организирайте фактурите си автоматично.
          Спестете време и намалете грешките.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            to={ROUTES.REGISTER}
            className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700"
          >
            Безплатен старт
          </Link>
          <Link
            to={ROUTES.HOW}
            className="rounded-lg border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Как работи
          </Link>
        </div>
      </div>
    </section>
  )
}
