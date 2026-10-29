'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { GlassCard } from './GlassCard'

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  className,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  className?: string
}) {
  return (
    <GlassCard className={cn('p-4 flex items-start gap-3', className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
        <Icon className="h-4.5 w-4.5" size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-semibold tracking-tight">{value}</p>
        {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </GlassCard>
  )
}
