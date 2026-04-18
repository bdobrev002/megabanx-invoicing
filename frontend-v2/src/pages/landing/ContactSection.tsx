import { useState } from 'react'
import { MessageSquare, Mail, Clock, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/api/client'

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return
    setSubmitting(true)
    setSuccess(null)
    setError(null)

    try {
      await apiFetch('/contact', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setSuccess('Благодарим ви! Съобщението е изпратено успешно. Ще ви отговорим възможно най-бързо.')
      setForm({ name: '', email: '', message: '' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка при изпращане')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="contact" className="py-20">
      <div className="mx-auto max-w-4xl px-4 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <MessageSquare className="w-4 h-4" /> Свържете се с нас
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Контакти</h2>
          <p className="text-gray-500">Имате въпрос? Изпратете ни запитване и ще ви отговорим възможно най-бързо.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Имейл</h3>
              <a href="mailto:info@megabanx.com" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">info@megabanx.com</a>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Работно време</h3>
              <p className="text-gray-600 text-sm">Пон - Пет: 9:00 - 18:00</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" /> Изпратете запитване
              </h3>

              {success && (
                <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" /> {success}
                </div>
              )}
              {error && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Вашето име *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Иван Иванов"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Имейл адрес *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="ivan@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                    required
                  />
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Вашето съобщение *</label>
                <textarea
                  value={form.message}
                  onChange={e => { if (e.target.value.length <= 500) setForm({ ...form, message: e.target.value }) }}
                  placeholder="Опишете вашия въпрос или запитване..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none text-sm"
                  required
                />
                <div className="flex justify-between items-center mt-1.5">
                  <p className="text-xs text-gray-400">Максимум 500 символа</p>
                  <p className={`text-xs font-medium ${form.message.length > 450 ? 'text-amber-500' : 'text-gray-400'} ${form.message.length >= 500 ? 'text-red-500' : ''}`}>
                    {form.message.length}/500
                  </p>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 text-sm"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {submitting ? 'Изпращане...' : 'Изпрати запитване'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
