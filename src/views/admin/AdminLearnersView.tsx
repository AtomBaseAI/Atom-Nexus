'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type ColumnDef } from '@tanstack/react-table'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { AdminShell } from './AdminShell'
import { DataTable } from '@/components/shared/data-table/DataTable'
import { PaymentStatusBadge } from '@/components/shared/PaymentStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShieldBan, ShieldCheck, Users, Eye } from 'lucide-react'

type Learner = {
  id: string
  name: string
  email: string
  status: string
  locale?: string
  preferredLocale?: string
  enrollmentCount?: number
  _count?: { enrollments?: number }
  totalPaid: number
  createdAt: string
}

type LearnerEnrollment = {
  id: string
  status: string
  completedLessons: number
  course: { id: string; title: string }
}

type LearnerOrder = {
  id: string
  status: string
  amount: number
  createdAt: string
}

type LearnerDetailResponse = {
  learner: Learner
  enrollments: LearnerEnrollment[]
  orders: LearnerOrder[]
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
]

export function AdminLearnersView() {
  const [learners, setLearners] = useState<Learner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [detail, setDetail] = useState<LearnerDetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<'DISABLED' | 'ACTIVE' | null>(null)
  const [bulkRows, setBulkRows] = useState<Learner[]>([])

  const load = useCallback(() => {
    api
      .get<{ learners: Learner[] }>('/api/admin/learners')
      .then((r) => setLearners(r.learners))
      .catch((err: Error) => {
        setLearners([])
        toast.error(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const openDetail = async (l: Learner) => {
    setDetail(null)
    setDetailLoading(true)
    try {
      const r = await api.get<LearnerDetailResponse>(`/api/admin/learners/${l.id}`)
      setDetail(r)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }

  const runBulkStatus = async () => {
    if (!bulkStatus) return
    const results = await Promise.allSettled(
      bulkRows.map((l) => api.patch(`/api/admin/learners/${l.id}`, { status: bulkStatus })),
    )
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - ok
    if (ok > 0) toast.success(`${ok} learner${ok === 1 ? '' : 's'} ${bulkStatus === 'DISABLED' ? 'disabled' : 'enabled'}`)
    if (failed > 0) toast.error(`${failed} update${failed === 1 ? '' : 's'} failed`)
    setReloadKey((k) => k + 1)
    setBulkStatus(null)
  }

  const columns = useMemo<ColumnDef<Learner>[]>(
    () => [
      {
        accessorKey: 'name',
        meta: { label: 'Name' },
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'email',
        meta: { label: 'Email' },
        cell: ({ row }) => (
          <span className="block max-w-44 truncate text-sm text-muted-foreground">
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        filterFn: 'equalsString',
        meta: { label: 'Status' },
        cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
      },
      {
        id: 'locale',
        accessorFn: (l) => l.preferredLocale ?? l.locale ?? '',
        meta: { label: 'Locale' },
        cell: ({ row }) => {
          const v = row.original.preferredLocale ?? row.original.locale
          return v ? (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium uppercase">
              {v}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
      {
        id: 'enrollments',
        accessorFn: (l) => l._count?.enrollments ?? l.enrollmentCount ?? 0,
        meta: { label: 'Enrollments', align: 'center' },
        enableGlobalFilter: false,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{Number(getValue())}</span>,
      },
      {
        id: 'totalPaid',
        accessorFn: (l) => l.totalPaid,
        meta: { label: 'Total paid', csv: (l) => l.totalPaid },
        enableGlobalFilter: false,
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-sm font-medium tabular-nums">
            {formatINR(Number(getValue()))}
          </span>
        ),
      },
      {
        id: 'joined',
        accessorFn: (l) => new Date(l.createdAt).getTime(),
        meta: {
          label: 'Joined',
          csv: (l) => fmtDate(l.createdAt),
        },
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
          const l = row.original
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openDetail(l)}
                aria-label={`View ${l.name}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setBulkRows([l])
                  setBulkStatus(l.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED')
                }}
                aria-label={l.status === 'DISABLED' ? `Enable ${l.name}` : `Disable ${l.name}`}
              >
                {l.status === 'DISABLED' ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ShieldBan className="h-4 w-4 text-rose-500" />
                )}
              </Button>
            </div>
          )
        },
      },
    ],
    [],
  )

  return (
    <AdminShell title="Learners">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Learners</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage student accounts and their purchases.</p>
      </div>

      <div className="mt-5">
        <DataTable
          columns={columns}
          data={learners}
          isLoading={isLoading}
          loadingRows={6}
          searchPlaceholder="Search name, email, status…"
          facets={[{ columnId: 'status', label: 'Status', options: STATUS_OPTIONS }]}
          enableSelection
          getRowId={(l) => l.id}
          exportFileName="learners"
          initialSorting={[{ id: 'joined', desc: true }]}
          onRefresh={() => {
            setIsLoading(true)
            setReloadKey((k) => k + 1)
          }}
          emptyState={{
            icon: Users,
            title: 'No learners found',
            description: 'Learners will appear here once they sign up.',
          }}
          bulkActions={(selected, clear) => (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => {
                  setBulkRows(selected)
                  setBulkStatus('ACTIVE')
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Enable
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => {
                  setBulkRows(selected)
                  setBulkStatus('DISABLED')
                }}
              >
                <ShieldBan className="h-3.5 w-3.5 text-rose-500" /> Disable
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>
                Deselect
              </Button>
            </>
          )}
        />
      </div>

      {/* Detail dialog */}
      <Dialog open={detail !== null || detailLoading} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.learner.name ?? 'Learner details'}</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.learner.email} · joined ${fmtDate(detail.learner.createdAt)}` : 'Loading…'}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Enrollments ({detail.enrollments.length})
                </p>
                {detail.enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No enrollments yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail.enrollments.map((e) => (
                      <div key={e.id} className="flex items-center gap-2 rounded-md border bg-background/60 p-2.5">
                        <span className="min-w-0 flex-1 truncate text-sm">{e.course.title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {e.completedLessons} lessons done
                        </span>
                        <PaymentStatusBadge status={e.status} className="shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Orders ({detail.orders.length})
                </p>
                {detail.orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail.orders.map((o) => (
                      <div key={o.id} className="flex items-center gap-2 rounded-md border bg-background/60 p-2.5">
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                          {o.id}
                        </span>
                        <span className="shrink-0 text-sm font-semibold">{formatINR(o.amount)}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{fmtDate(o.createdAt)}</span>
                        <PaymentStatusBadge status={o.status} className="shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enable / disable confirm (single row or bulk) */}
      <ConfirmDialog
        open={bulkStatus !== null}
        onOpenChange={(open) => !open && setBulkStatus(null)}
        title={bulkStatus === 'DISABLED' ? 'Disable learner(s)?' : 'Enable learner(s)?'}
        description={
          bulkStatus === 'DISABLED'
            ? `${bulkRows.length} learner${bulkRows.length === 1 ? '' : 's'} will lose access to learning until re-enabled.`
            : `${bulkRows.length} learner${bulkRows.length === 1 ? '' : 's'} will regain full access to their courses.`
        }
        confirmLabel={bulkStatus === 'DISABLED' ? 'Disable' : 'Enable'}
        onConfirm={runBulkStatus}
      />
    </AdminShell>
  )
}
