'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { api } from '@/lib/api'
import { useNavStore } from '@/stores/nav-store'
import { LearnShell } from './LearnShell'
import { GlassCard } from '@/components/shared/GlassCard'
import { PaymentStatusBadge } from '@/components/shared/PaymentStatusBadge'
import { ListSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/lib/money'
import { Receipt, ExternalLink } from 'lucide-react'

type Order = {
  id: string
  status: string
  totalAmount: number
  currency: string
  razorpayOrderId: string
  createdAt: string
  paidAt: string | null
  course: { id: string; title: string; slug: string; thumbnailUrl: string }
  payments: { id: string; status: string; amount: number; refundedAmount: number }[]
}

export function OrdersView() {
  const { t, locale } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const [orders, setOrders] = useState<Order[] | null>(null)

  useEffect(() => {
    api
      .get<{ orders: Order[] }>('/api/learn/orders')
      .then((r) => setOrders(r.orders))
      .catch(() => setOrders([]))
  }, [])

  return (
    <LearnShell title={t('orders.title')}>
      <h1 className="text-2xl font-bold tracking-tight">{t('orders.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('orders.subtitle')}</p>

      <div className="mt-5">
        {orders === null ? (
          <ListSkeleton rows={4} />
        ) : orders.length === 0 ? (
          <EmptyState icon={Receipt} title={t('orders.empty.title')} description={t('orders.empty.desc')} />
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <GlassCard key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="h-14 w-24 shrink-0 overflow-hidden rounded-md bg-secondary">
                  {o.course.thumbnailUrl && (
                     
                    <img src={o.course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{o.course.title}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{o.razorpayOrderId}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(o.paidAt ?? o.createdAt).toLocaleDateString(locale === 'en' ? 'en-IN' : locale, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <span className="text-base font-bold">{formatINR(o.totalAmount, locale)}</span>
                  <PaymentStatusBadge status={o.status} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate({ name: 'course', slug: o.course.slug })}
                  className="shrink-0"
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> {t('orders.goToCourse')}
                </Button>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </LearnShell>
  )
}
