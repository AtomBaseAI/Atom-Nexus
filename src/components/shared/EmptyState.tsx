'use client'

import { LucideIcon } from 'lucide-react'
import { GlassCard } from './GlassCard'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <GlassCard className={`flex flex-col items-center justify-center gap-3 p-10 text-center ${className ?? ''}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </GlassCard>
  )
}
