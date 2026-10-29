'use client'

import { cn } from '@/lib/utils'

/**
 * Infinite horizontal (or vertical) marquee — Magic UI style.
 * Renders `repeat` copies of `children`, each copy translating by
 * -100% - gap so the loop is perfectly seamless.
 */
export function Marquee({
  className,
  reverse = false,
  pause = false,
  repeat = 4,
  duration = '40s',
  gap = '1rem',
  vertical = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  reverse?: boolean
  pause?: boolean
  repeat?: number
  duration?: string
  gap?: string
  vertical?: boolean
}) {
  return (
    <div
      {...props}
      className={cn('group flex overflow-hidden', vertical ? 'flex-col' : 'flex-row', className)}
      style={{ '--duration': duration, '--gap': gap } as React.CSSProperties}
    >
      {Array.from({ length: Math.max(repeat, 2) }).map((_, i) => (
        <div
          key={i}
          aria-hidden={i > 0}
          className={cn(
            'flex shrink-0 items-center justify-around [gap:var(--gap)]',
            vertical ? 'animate-marquee-vertical flex-col' : 'animate-marquee flex-row',
            reverse && '[animation-direction:reverse]',
            pause && 'group-hover:[animation-play-state:paused]',
          )}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
