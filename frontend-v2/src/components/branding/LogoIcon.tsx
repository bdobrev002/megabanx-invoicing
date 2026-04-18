interface LogoIconProps {
  size?: number
  className?: string
}

export default function LogoIcon({ size = 32, className = '' }: LogoIconProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-blue-600 ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="font-bold text-white" style={{ fontSize: size * 0.5 }}>
        M
      </span>
    </div>
  )
}
