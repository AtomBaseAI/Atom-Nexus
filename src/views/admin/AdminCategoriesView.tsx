'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type ColumnDef } from '@tanstack/react-table'
import { api } from '@/lib/api'
import { AdminShell } from './AdminShell'
import { DataTable } from '@/components/shared/data-table/DataTable'
import { GlassCard } from '@/components/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Tags } from 'lucide-react'

type Category = {
  id: string
  name: string
  slug: string
  courseCount?: number
  _count?: { courses?: number }
  createdAt: string
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export function AdminCategoriesView() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    api
      .get<{ categories: Category[] }>('/api/admin/categories')
      .then((r) => setCategories(r.categories))
      .catch((err: Error) => {
        setCategories([])
        toast.error(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const add = async () => {
    if (!name.trim()) {
      toast.error('Enter a category name.')
      return
    }
    setAdding(true)
    try {
      await api.post('/api/admin/categories', { name: name.trim() })
      toast.success('Category added')
      setName('')
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAdding(false)
    }
  }

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        accessorKey: 'name',
        meta: { label: 'Name' },
        cell: ({ getValue }) => <span className="text-sm font-medium">{String(getValue())}</span>,
      },
      {
        accessorKey: 'slug',
        meta: { label: 'Slug' },
        cell: ({ getValue }) => (
          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">
            {String(getValue())}
          </span>
        ),
      },
      {
        id: 'courses',
        accessorFn: (c) => c._count?.courses ?? c.courseCount ?? 0,
        meta: { label: 'Courses', align: 'center' },
        enableGlobalFilter: false,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{Number(getValue())}</span>,
      },
      {
        id: 'createdAt',
        accessorFn: (c) => new Date(c.createdAt).getTime(),
        meta: { label: 'Created', csv: (c) => fmtDate(c.createdAt) },
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {fmtDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <AdminShell title="Categories">
      <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
      <p className="mt-1 text-sm text-muted-foreground">Organize the catalog with course categories.</p>

      <GlassCard className="mt-5 flex flex-col gap-2 p-4 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New category name, e.g. Data Science"
          aria-label="Category name"
        />
        <Button className="primary-button shrink-0" onClick={add} disabled={adding}>
          <Plus className="mr-1 h-4 w-4" /> {adding ? 'Adding…' : 'Add category'}
        </Button>
      </GlassCard>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={categories}
          isLoading={isLoading}
          loadingRows={5}
          searchPlaceholder="Search name or slug…"
          getRowId={(c) => c.id}
          exportFileName="categories"
          initialSorting={[{ id: 'name', desc: false }]}
          onRefresh={() => {
            setIsLoading(true)
            setReloadKey((k) => k + 1)
          }}
          emptyState={{
            icon: Tags,
            title: 'No categories yet',
            description: 'Add your first category above to start organizing courses.',
          }}
        />
      </div>
    </AdminShell>
  )
}
