'use client'

import { cn } from '@/lib/utils'

/** Liquid Glass surface — the base container of the design system. */
export function GlassCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass rounded-lg', className)} {...props}>
      {children}
    </div>
  )
}
