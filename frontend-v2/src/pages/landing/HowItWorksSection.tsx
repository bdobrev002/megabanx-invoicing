import { Upload, Cpu, FolderOpen } from 'lucide-react'

const steps = [
  { icon: Upload, title: 'Качете', description: 'Плъзнете PDF файлове или ги изберете от компютъра си.' },
  { icon: Cpu, title: 'Обработете', description: 'AI анализира фактурите и извлича данните автоматично.' },
  { icon: FolderOpen, title: 'Организирайте', description: 'Файловете се подреждат по фирми в Google Drive.' },
]

export default function HowItWorksSection() {
  return (
    <section id="how" className="py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Как работи</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, description }, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
                <Icon size={32} className="text-indigo-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
