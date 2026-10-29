'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type ColumnDef } from '@tanstack/react-table'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { AdminShell } from './AdminShell'
import { DataTable } from '@/components/shared/data-table/DataTable'
import { GlassCard } from '@/components/shared/GlassCard'
import { PaymentStatusBadge } from '@/components/shared/PaymentStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, RotateCcw } from 'lucide-react'

type Refund = { id: string; amount: number; status?: string; createdAt?: string }

type Payment = {
  id: string
  status: string
  refunds?: Refund[]
}

type AdminOrder = {
  id: string
  status: string
  amount: number
  totalAmount?: number
  learner: { id: string; name: string; email: string }
  course?: { id: string; title: string } | null
  razorpayOrderId?: string | null
  razorpayPaymentId?: string | null
  payment?: Payment | null
  createdAt: string
}

const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
]

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')

export function AdminPaymentsView() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [refundTarget, setRefundTarget] = useState<AdminOrder | null>(null)

  const load = useCallback(() => {
    api
      .get<{ orders: AdminOrder[] }>('/api/admin/payments')
      .then((r) => setOrders(r.orders))
      .catch((err: Error) => {
        setOrders([])
        toast.error(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const refund = async () => {
    if (!refundTarget?.payment) return
    try {
      await api.post(`/api/admin/payments/${refundTarget.payment.id}/refund`)
      toast.success('Refund initiated')
      setReloadKey((k) => k + 1)
      setRefundTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
      throw err
    }
  }

  const paidTotal = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'PAID')
        .reduce((sum, o) => sum + (o.amount ?? o.totalAmount ?? 0), 0),
    [orders],
  )

  const statusFacetOptions = useMemo(
    () => ORDER_STATUSES.map((s) => ({ value: s, label: titleCase(s) })),
    [],
  )

  const columns = useMemo<ColumnDef<AdminOrder>[]>(
    () => [
      {
        accessorKey: 'id',
        meta: { label: 'Order ID' },
        cell: ({ getValue }) => (
          <span className="block max-w-28 truncate font-mono text-[11px]" title={String(getValue())}>
            {String(getValue())}
          </span>
        ),
      },
      {
        id: 'learner',
        accessorFn: (o) => o.learner?.name ?? '',
        meta: { label: 'Learner' },
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.learner?.name ?? '—'}</p>
            <p className="max-w-36 truncate text-xs text-muted-foreground">{row.original.learner?.email}</p>
          </div>
        ),
      },
      {
        id: 'course',
        accessorFn: (o) => o.course?.title ?? '',
        meta: { label: 'Course' },
        cell: ({ getValue }) => (
          <span className="block max-w-40 truncate text-sm" title={String(getValue())}>
            {(getValue() as string) || '—'}
          </span>
        ),
      },
      {
        id: 'amount',
        accessorFn: (o) => o.amount ?? o.totalAmount ?? 0,
        meta: { label: 'Amount', csv: (o) => o.amount ?? o.totalAmount ?? 0 },
        enableGlobalFilter: false,
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
            {formatINR(Number(getValue()))}
          </span>
        ),
      },
      {
        id: 'razorpayIds',
        accessorFn: (o) => `${o.razorpayOrderId ?? ''} ${o.razorpayPaymentId ?? ''}`,
        enableSorting: false,
        meta: {
          label: 'Razorpay IDs',
          csv: (o) => `${o.razorpayOrderId ?? ''} / ${o.razorpayPaymentId ?? ''}`,
        },
        cell: ({ row }) => {
          const o = row.original
          return (
            <div className="space-y-0.5 font-mono text-[10px] text-muted-foreground">
              <p className="max-w-32 truncate" title={o.razorpayOrderId ?? ''}>
                order: {o.razorpayOrderId ?? '—'}
              </p>
              <p className="max-w-32 truncate" title={o.razorpayPaymentId ?? ''}>
                pay: {o.razorpayPaymentId ?? '—'}
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        filterFn: 'equalsString',
        meta: { label: 'Status' },
        cell: ({ row }) => {
          const o = row.original
          return (
            <div className="space-y-1">
              <PaymentStatusBadge status={o.status} />
              {(o.payment?.refunds ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(o.payment?.refunds ?? []).map((r) => (
                    <Badge
                      key={r.id}
                      variant="outline"
                      className="text-[10px] text-violet-700 dark:text-violet-300"
                    >
                      refund {formatINR(r.amount)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )
        },
      },
      {
        id: 'createdAt',
        accessorFn: (o) => new Date(o.createdAt).getTime(),
        meta: { label: 'Date', csv: (o) => fmtDate(o.createdAt) },
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {fmtDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
        meta: { label: 'Actions', isActions: true, align: 'right' },
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const o = row.original
          return (
            <div className="flex justify-end">
              {o.status === 'PAID' && o.payment && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                  onClick={() => setRefundTarget(o)}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Refund
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [],
  )

  return (
    <AdminShell title="Payments">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Razorpay orders, payments and refunds.</p>
      </div>

      {/* Summary chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <GlassCard className="px-4 py-2">
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="text-lg font-semibold">{isLoading ? '—' : orders.length}</p>
        </GlassCard>
        <GlassCard className="px-4 py-2">
          <p className="text-xs text-muted-foreground">Paid total</p>
          <p className="text-lg font-semibold text-emerald-600">
            {isLoading ? '—' : formatINR(paidTotal)}
          </p>
        </GlassCard>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          loadingRows={6}
          searchPlaceholder="Search order, learner, course or Razorpay ID…"
          facets={[{ columnId: 'status', label: 'Status', options: statusFacetOptions }]}
          getRowId={(o) => o.id}
          exportFileName="payments"
          initialSorting={[{ id: 'createdAt', desc: true }]}
          onRefresh={() => {
            setIsLoading(true)
            setReloadKey((k) => k + 1)
          }}
          emptyState={{
            icon: CreditCard,
            title: 'No payments found',
            description: 'Orders will appear here once learners start purchasing.',
          }}
        />
      </div>

      <ConfirmDialog
        open={refundTarget !== null}
        onOpenChange={(open) => !open && setRefundTarget(null)}
        title="Issue refund?"
        description={`Refund ${formatINR(refundTarget?.amount ?? refundTarget?.totalAmount ?? 0)} to ${refundTarget?.learner?.name ?? ''} for "${refundTarget?.course?.title ?? ''}".`}
        confirmLabel="Refund"
        onConfirm={refund}
      />
    </AdminShell>
  )
}
