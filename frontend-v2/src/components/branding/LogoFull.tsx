interface LogoFullProps {
  className?: string
  dark?: boolean
}

export default function LogoFull({ className = '', dark = false }: LogoFullProps) {
  const textColor = dark ? 'text-white' : 'text-gray-900'
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
        <span className="text-lg font-bold text-white">M</span>
      </div>
      <span className={`text-xl font-bold ${textColor}`}>
        Mega<span className="text-blue-600">Banx</span>
      </span>
    </div>
  )
}
