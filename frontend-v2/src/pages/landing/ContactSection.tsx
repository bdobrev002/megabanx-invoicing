export default function ContactSection() {
  return (
    <section id="contact" className="py-20">
      <div className="mx-auto max-w-xl px-4 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Контакт</h2>
        <p className="mt-4 text-center text-gray-600">
          Имате въпрос? Пишете ни и ще ви отговорим възможно най-бързо.
        </p>
        <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            placeholder="Вашето име"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="email"
            placeholder="Имейл адрес"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <textarea
            rows={4}
            placeholder="Вашето съобщение"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Изпрати
          </button>
        </form>
      </div>
    </section>
  )
}
