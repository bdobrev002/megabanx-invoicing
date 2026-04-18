interface LogoFullProps {
  className?: string
  dark?: boolean
  size?: 'sm' | 'md'
}

export default function LogoFull({ className = '', dark = false, size = 'md' }: LogoFullProps) {
  const iconSize = size === 'sm' ? 32 : 36
  const textClass = size === 'sm' ? 'text-lg' : 'text-xl'
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
        <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#gLogoMB)" />
        <rect x="16" y="12" width="16" height="20" rx="2" fill="white" opacity="0.9" />
        <line x1="19" y1="18" x2="29" y2="18" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="19" y1="22" x2="27" y2="22" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <line x1="19" y1="26" x2="25" y2="26" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        <circle cx="38" cy="8" r="5" fill="#f97316" />
        <path d="M38 5.5v5M35.5 8h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <defs>
          <linearGradient id="gLogoMB" x1="2" y1="2" x2="46" y2="46">
            <stop stopColor="#4f46e5" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <span className={`${textClass} font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
        Mega<span className="text-indigo-400">Ban</span><span className="text-orange-400 font-extrabold">x</span>
      </span>
    </div>
  )
}
