'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type ColumnDef } from '@tanstack/react-table'
import { api } from '@/lib/api'
import { AdminShell } from './AdminShell'
import { DataTable } from '@/components/shared/data-table/DataTable'
import { PaymentStatusBadge } from '@/components/shared/PaymentStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { GraduationCap, Undo2 } from 'lucide-react'

type Enrollment = {
  id: string
  status: string
  enrolledAt: string
  totalLessons?: number
  completedLessons?: number
  learner: { id: string; name: string; email: string }
  course: { id: string; title: string }
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const percentOf = (e: Enrollment) => {
  const total = e.totalLessons ?? 0
  const done = e.completedLessons ?? 0
  if (total <= 0) return 0
  return Math.min(100, Math.round((done / total) * 100))
}

export function AdminEnrollmentsView() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [revokeTargets, setRevokeTargets] = useState<Enrollment[]>([])

  const load = useCallback(() => {
    api
      .get<{ enrollments: Enrollment[] }>('/api/admin/enrollments')
      .then((r) => setEnrollments(r.enrollments))
      .catch((err: Error) => {
        setEnrollments([])
        toast.error(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const runRevoke = async () => {
    const results = await Promise.allSettled(
      revokeTargets.map((e) => api.del(`/api/admin/enrollments/${e.id}`)),
    )
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - ok
    if (ok > 0) toast.success(`Enrollment${ok === 1 ? '' : 's'} revoked`)
    if (failed > 0) toast.error(`${failed} revocation${failed === 1 ? '' : 's'} failed`)
    setReloadKey((k) => k + 1)
    setRevokeTargets([])
  }

  const courseFacetOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of enrollments) {
      if (!seen.has(e.course.id)) seen.set(e.course.id, e.course.title)
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }))
  }, [enrollments])

  const statusFacetOptions = useMemo(() => {
    const set = new Set(enrollments.map((e) => e.status))
    return [...set].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))
  }, [enrollments])

  const columns = useMemo<ColumnDef<Enrollment>[]>(
    () => [
      {
        id: 'learner',
        accessorFn: (e) => e.learner?.name ?? '',
        meta: { label: 'Learner' },
        cell: ({ row }) => {
          const l = row.original.learner
          return (
            <div>
              <p className="text-sm font-medium">{l?.name ?? '—'}</p>
              <p className="max-w-40 truncate text-xs text-muted-foreground">{l?.email}</p>
            </div>
          )
        },
      },
      {
        id: 'course',
        accessorFn: (e) => e.course.title,
        filterFn: 'equalsString',
        meta: { label: 'Course' },
        cell: ({ getValue }) => (
          <span className="block max-w-48 truncate text-sm" title={String(getValue())}>
            {String(getValue())}
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
        id: 'enrolledAt',
        accessorFn: (e) => new Date(e.enrolledAt).getTime(),
        meta: { label: 'Enrolled', csv: (e) => fmtDate(e.enrolledAt) },
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {fmtDate(row.original.enrolledAt)}
          </span>
        ),
      },
      {
        id: 'progress',
        accessorFn: (e) => percentOf(e),
        meta: { label: 'Progress', csv: (e) => `${percentOf(e)}%` },
        enableGlobalFilter: false,
        cell: ({ row }) => {
          const e = row.original
          return (
            <div className="flex items-center gap-2">
              <Progress value={percentOf(e)} className="h-1.5 w-24" />
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {e.completedLessons ?? 0}/{e.totalLessons ?? 0}
              </span>
            </div>
          )
        },
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
        meta: { label: 'Actions', isActions: true, align: 'right' },
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
              onClick={() => setRevokeTargets([row.original])}
            >
              <Undo2 className="mr-1 h-3.5 w-3.5" /> Revoke
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <AdminShell title="Enrollments">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Enrollments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Who is learning what, and how far along they are.</p>
      </div>

      <div className="mt-5">
        <DataTable
          columns={columns}
          data={enrollments}
          isLoading={isLoading}
          loadingRows={6}
          searchPlaceholder="Search learner or course…"
          facets={[
            { columnId: 'course', label: 'Course', options: courseFacetOptions },
            { columnId: 'status', label: 'Status', options: statusFacetOptions },
          ]}
          enableSelection
          getRowId={(e) => e.id}
          exportFileName="enrollments"
          initialSorting={[{ id: 'enrolledAt', desc: true }]}
          onRefresh={() => {
            setIsLoading(true)
            setReloadKey((k) => k + 1)
          }}
          emptyState={{
            icon: GraduationCap,
            title: 'No enrollments',
            description: 'Enrollments will appear here once learners join courses.',
          }}
          bulkActions={(selected, clear) => (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                onClick={() => setRevokeTargets(selected)}
              >
                <Undo2 className="h-3.5 w-3.5" /> Revoke selected
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>
                Deselect
              </Button>
            </>
          )}
        />
      </div>

      <ConfirmDialog
        open={revokeTargets.length > 0}
        onOpenChange={(open) => !open && setRevokeTargets([])}
        title={revokeTargets.length === 1 ? 'Revoke enrollment?' : `Revoke ${revokeTargets.length} enrollments?`}
        description={
          revokeTargets.length === 1
            ? `"${revokeTargets[0]?.learner?.name ?? ''}" will lose access to "${revokeTargets[0]?.course.title ?? ''}". Their progress will be kept.`
            : 'The selected learners will lose access to their courses. Their progress will be kept.'
        }
        confirmLabel="Revoke"
        onConfirm={runRevoke}
      />
    </AdminShell>
  )
}
