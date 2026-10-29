'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type ColumnDef } from '@tanstack/react-table'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { useNavStore } from '@/stores/nav-store'
import { AdminShell } from './AdminShell'
import { DataTable } from '@/components/shared/data-table/DataTable'
import { PaymentStatusBadge } from '@/components/shared/PaymentStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Archive, BookOpen, EyeOff, MoreHorizontal, Plus, Send } from 'lucide-react'

type AdminCourse = {
  id: string
  title: string
  slug: string
  thumbnailUrl: string
  status: string
  isFree: boolean
  priceAmount: number
  category: { id: string; name: string } | null
  _count?: { sections?: number; lessons?: number; enrollments?: number }
  sections?: number
  lessons?: number
  enrollments?: number
  sectionCount?: number
  lessonCount?: number
  enrollmentCount?: number
  updatedAt: string
}

type Category = { id: string; name: string; slug: string }

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const DEFAULT_SHORT_DESCRIPTION = 'Course description — edit me (min 20 chars for publishing).'

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
]

type BulkAction = 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE'

const BULK_LABEL: Record<BulkAction, string> = {
  PUBLISH: 'Publish',
  UNPUBLISH: 'Unpublish',
  ARCHIVE: 'Archive',
}

const BULK_PAST: Record<BulkAction, string> = {
  PUBLISH: 'published',
  UNPUBLISH: 'unpublished',
  ARCHIVE: 'archived',
}

export function AdminCoursesView() {
  const navigate = useNavStore((s) => s.navigate)
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminCourse | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkAction, setBulkAction] = useState<{ action: BulkAction; rows: AdminCourse[] } | null>(null)

  const load = useCallback(() => {
    api
      .get<{ courses: AdminCourse[] }>('/api/admin/courses')
      .then((r) => setCourses(r.courses))
      .catch((err: Error) => {
        setCourses([])
        toast.error(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  useEffect(() => {
    api
      .get<{ categories: Category[] }>('/api/categories')
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]))
  }, [])

  const createCourse = async () => {
    if (!newTitle.trim() || !newCategoryId) {
      toast.error('Please enter a title and pick a category.')
      return
    }
    setCreating(true)
    try {
      const r = await api.post<{ course?: { id: string }; id?: string }>('/api/admin/courses', {
        title: newTitle.trim(),
        categoryId: newCategoryId,
        shortDescription: DEFAULT_SHORT_DESCRIPTION,
      })
      toast.success('Course created')
      setCreateOpen(false)
      setNewTitle('')
      const id = r.course?.id ?? r.id
      if (id) navigate({ name: 'admin-editor', courseId: id })
      else load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const publish = async (c: AdminCourse) => {
    setBusyId(c.id)
    try {
      await api.post(`/api/admin/courses/${c.id}/publish`)
      toast.success('Course published')
      load()
    } catch (err) {
      const e = err as Error & { status?: number }
      if (e.status === 422) {
        toast.error('Cannot publish course', { description: e.message })
      } else {
        toast.error(e.message)
      }
    } finally {
      setBusyId(null)
    }
  }

  const unpublish = async (c: AdminCourse) => {
    setBusyId(c.id)
    try {
      await api.post(`/api/admin/courses/${c.id}/unpublish`)
      toast.success('Course unpublished')
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const archive = async (c: AdminCourse) => {
    setBusyId(c.id)
    try {
      await api.patch(`/api/admin/courses/${c.id}`, { status: 'ARCHIVED' })
      toast.success('Course archived')
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (c: AdminCourse) => {
    try {
      await api.del(`/api/admin/courses/${c.id}`)
      toast.success('Course deleted')
      load()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const runBulk = async () => {
    if (!bulkAction) return
    const { action, rows } = bulkAction
    const results = await Promise.allSettled(
      rows.map((c) => {
        if (action === 'PUBLISH') return api.post(`/api/admin/courses/${c.id}/publish`)
        if (action === 'UNPUBLISH') return api.post(`/api/admin/courses/${c.id}/unpublish`)
        return api.patch(`/api/admin/courses/${c.id}`, { status: 'ARCHIVED' })
      }),
    )
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - ok
    if (ok > 0) toast.success(`${ok} course${ok === 1 ? '' : 's'} ${BULK_PAST[action]}`)
    if (failed > 0) {
      const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
      toast.error(`${failed} course${failed === 1 ? '' : 's'} could not be updated`, {
        description: (firstError?.reason as Error | undefined)?.message,
      })
    }
    setReloadKey((k) => k + 1)
    setBulkAction(null)
  }

  const count = (c: AdminCourse, key: 'sections' | 'lessons' | 'enrollments') =>
    c._count?.[key] ?? c[key] ?? c[`${key.slice(0, -1)}Count` as 'sectionCount' | 'lessonCount' | 'enrollmentCount'] ?? 0

  const columns = useMemo<ColumnDef<AdminCourse>[]>(
    () => [
      {
        accessorKey: 'title',
        meta: { label: 'Course' },
        cell: ({ row }) => {
          const c = row.original
          return (
            <button
              className="flex items-center gap-2.5 text-left"
              onClick={() => navigate({ name: 'admin-editor', courseId: c.id })}
            >
              <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-secondary">
                {c.thumbnailUrl && (
                  <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <span className="line-clamp-2 max-w-56 text-sm font-medium hover:text-primary">
                {c.title}
              </span>
            </button>
          )
        },
      },
      {
        id: 'category',
        accessorFn: (c) => c.category?.name ?? '',
        meta: { label: 'Category' },
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{(getValue() as string) || '—'}</span>
        ),
      },
      {
        id: 'price',
        accessorFn: (c) => (c.isFree ? 0 : c.priceAmount),
        meta: { label: 'Price', csv: (c) => (c.isFree ? 'Free' : c.priceAmount) },
        enableGlobalFilter: false,
        cell: ({ row }) => {
          const c = row.original
          return (
            <span className="whitespace-nowrap text-sm font-medium tabular-nums">
              {c.isFree ? <span className="text-emerald-600">Free</span> : formatINR(c.priceAmount)}
            </span>
          )
        },
      },
      {
        id: 'sections',
        accessorFn: (c) => count(c, 'sections'),
        meta: { label: 'Sections', align: 'center' },
        enableGlobalFilter: false,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{Number(getValue())}</span>,
      },
      {
        id: 'lessons',
        accessorFn: (c) => count(c, 'lessons'),
        meta: { label: 'Lessons', align: 'center' },
        enableGlobalFilter: false,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{Number(getValue())}</span>,
      },
      {
        id: 'enrollments',
        accessorFn: (c) => count(c, 'enrollments'),
        meta: { label: 'Enrollments', align: 'center' },
        enableGlobalFilter: false,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{Number(getValue())}</span>,
      },
      {
        accessorKey: 'status',
        filterFn: 'equalsString',
        meta: { label: 'Status' },
        cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
      },
      {
        id: 'updatedAt',
        accessorFn: (c) => new Date(c.updatedAt).getTime(),
        meta: { label: 'Updated', csv: (c) => fmtDate(c.updatedAt) },
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {fmtDate(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
        meta: { label: 'Actions', isActions: true },
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const c = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={busyId === c.id}
                  aria-label={`Actions for ${c.title}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => navigate({ name: 'admin-editor', courseId: c.id })}>
                  Edit
                </DropdownMenuItem>
                {c.status !== 'PUBLISHED' && (
                  <DropdownMenuItem onClick={() => publish(c)}>Publish</DropdownMenuItem>
                )}
                {c.status === 'PUBLISHED' && (
                  <DropdownMenuItem onClick={() => unpublish(c)}>Unpublish</DropdownMenuItem>
                )}
                {c.status !== 'ARCHIVED' && (
                  <DropdownMenuItem onClick={() => archive(c)}>Archive</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-600"
                  onClick={() => setDeleteTarget(c)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [busyId],
  )

  return (
    <AdminShell title="Courses">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create, publish and manage your catalog.</p>
      </div>

      <div className="mt-5">
        <DataTable
          columns={columns}
          data={courses}
          isLoading={isLoading}
          loadingRows={5}
          searchPlaceholder="Search title, slug, category…"
          facets={[{ columnId: 'status', label: 'Status', options: STATUS_OPTIONS }]}
          enableSelection
          getRowId={(c) => c.id}
          exportFileName="courses"
          initialSorting={[{ id: 'updatedAt', desc: true }]}
          onRefresh={() => {
            setIsLoading(true)
            setReloadKey((k) => k + 1)
          }}
          emptyState={{
            icon: BookOpen,
            title: 'No courses found',
            description: 'Create your first course to get started.',
            action: (
              <Button className="primary-button" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> New course
              </Button>
            ),
          }}
          toolbarExtra={
            <Button className="primary-button h-8 shrink-0 text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> New course
            </Button>
          }
          bulkActions={(selected, clear) => (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setBulkAction({ action: 'PUBLISH', rows: selected })}
              >
                <Send className="h-3.5 w-3.5 text-emerald-600" /> Publish
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setBulkAction({ action: 'UNPUBLISH', rows: selected })}
              >
                <EyeOff className="h-3.5 w-3.5" /> Unpublish
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setBulkAction({ action: 'ARCHIVE', rows: selected })}
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>
                Deselect
              </Button>
            </>
          )}
        />
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New course</DialogTitle>
            <DialogDescription>Pick a title and category — you can edit everything later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-course-title">Title</Label>
              <Input
                id="new-course-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Complete Web Development Bootcamp"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger aria-label="Course category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button className="primary-button" onClick={createCourse} disabled={creating}>
              {creating ? 'Creating…' : 'Create course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete course?"
        description={`"${deleteTarget?.title ?? ''}" and all of its content will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget)
        }}
      />

      {/* Bulk status confirm */}
      <ConfirmDialog
        open={bulkAction !== null}
        onOpenChange={(open) => !open && setBulkAction(null)}
        title={bulkAction ? `${BULK_LABEL[bulkAction.action]} ${bulkAction.rows.length} course(s)?` : ''}
        description={
          bulkAction?.action === 'PUBLISH'
            ? 'Courses must have at least one section and lesson to publish — those that do not will be skipped.'
            : 'Learners already enrolled will keep their access.'
        }
        confirmLabel={bulkAction ? BULK_LABEL[bulkAction.action] : 'Confirm'}
        onConfirm={runBulk}
      />
    </AdminShell>
  )
}
