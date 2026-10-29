import { cn } from '@/lib/utils'

/** Pill badge whose text is filled by a continuously shifting gradient. */
export function AnimatedGradientText({
  children,
  icon,
  className,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1.5 text-xs font-medium shadow-sm',
        className,
      )}
    >
      {icon && <span className="text-primary">{icon}</span>}
      <span className="animate-gradient-x bg-gradient-to-r from-primary via-[#c084fc] to-primary bg-[length:200%_auto] bg-clip-text font-semibold text-transparent">
        {children}
      </span>
    </div>
  )
}
