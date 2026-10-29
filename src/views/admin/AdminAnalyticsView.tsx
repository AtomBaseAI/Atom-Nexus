'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type ColumnDef } from '@tanstack/react-table'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { AdminShell } from './AdminShell'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/data-table/DataTable'
import { StatGridSkeleton, ListSkeleton } from '@/components/shared/LoadingSkeleton'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, Percent, RotateCcw, TrendingUp } from 'lucide-react'

type AnalyticsDay = { date: string; revenue: number; enrollments: number }

type AnalyticsResponse = {
  rates?: { paymentFailureRate?: number; refundTotal?: number; lessonCompletionRate?: number }
  days?: AnalyticsDay[]
  revenueByCourse?: {
    id: string
    title: string
    slug?: string
    orders: number
    revenue: number
    revenueLabel?: string
  }[]
}

type ChartPoint = { label: string; revenue: number; enrollments: number }

type RevenueRow = NonNullable<AnalyticsResponse['revenueByCourse']>[number]

const PRIMARY = '#7700FF'

export function AdminAnalyticsView() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)

  useEffect(() => {
    api
      .get<AnalyticsResponse>('/api/admin/analytics')
      .then(setData)
      .catch((err: Error) => toast.error(err.message))
  }, [])

  const days: ChartPoint[] = (data?.days ?? []).map((d) => {
    let label = d.date
    const parsed = new Date(d.date)
    if (!Number.isNaN(parsed.getTime())) {
      label = parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }
    return { label, revenue: d.revenue, enrollments: d.enrollments }
  })

  const byCourse: RevenueRow[] = useMemo(
    () => [...(data?.revenueByCourse ?? [])].sort((a, b) => b.revenue - a.revenue),
    [data],
  )
  const maxRevenue = byCourse.reduce((m, c) => Math.max(m, c.revenue), 0)

  const revenueColumns = useMemo<ColumnDef<RevenueRow>[]>(
    () => [
      {
        accessorKey: 'title',
        meta: { label: 'Course' },
        cell: ({ getValue }) => (
          <span className="block max-w-72 truncate text-sm font-medium" title={String(getValue())}>
            {String(getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'orders',
        meta: { label: 'Orders', align: 'center' },
        enableGlobalFilter: false,
        cell: ({ getValue }) => (
          <span className="text-sm tabular-nums">
            {Number(getValue())} {Number(getValue()) === 1 ? 'order' : 'orders'}
          </span>
        ),
      },
      {
        id: 'revenue',
        accessorFn: (r) => r.revenue,
        meta: { label: 'Revenue', csv: (r) => r.revenue },
        enableGlobalFilter: false,
        cell: ({ row }) => {
          const r = row.original
          const share = maxRevenue > 0 ? Math.max(2, Math.round((r.revenue / maxRevenue) * 100)) : 0
          return (
            <div className="flex min-w-44 items-center gap-3">
              <span className="shrink-0 text-sm font-semibold tabular-nums">{formatINR(r.revenue)}</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${share}%` }} />
              </div>
            </div>
          )
        },
      },
    ],
    [maxRevenue],
  )

  return (
    <AdminShell title="Analytics">
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">Revenue, enrollment and completion trends.</p>

      {/* Rate stats */}
      <div className="mt-5">
        {!data ? (
          <StatGridSkeleton count={3} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Percent}
              label="Payment failure rate"
              value={`${(data.rates?.paymentFailureRate ?? 0).toFixed(1)}%`}
            />
            <StatCard
              icon={RotateCcw}
              label="Refund total"
              value={formatINR(data.rates?.refundTotal ?? 0)}
            />
            <StatCard
              icon={TrendingUp}
              label="Lesson completion rate"
              value={`${(data.rates?.lessonCompletionRate ?? 0).toFixed(1)}%`}
            />
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GlassCard className="p-5">
          <h2 className="text-base font-semibold tracking-tight">Revenue (last 30 days)</h2>
          {data === null ? (
            <ListSkeleton rows={3} className="mt-4" />
          ) : (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={days} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(119,0,255,0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tickFormatter={(v: number) => formatINR(Number(v))}
                  />
                  <Tooltip formatter={(value) => formatINR(Number(value))} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={PRIMARY}
                    strokeWidth={2}
                    fill="url(#revGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="text-base font-semibold tracking-tight">Enrollments (last 30 days)</h2>
          {data === null ? (
            <ListSkeleton rows={3} className="mt-4" />
          ) : (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={days} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(119,0,255,0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="enrollments" fill={PRIMARY} fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Revenue by course — advanced data table */}
      <div className="mt-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight">
          <BarChart3 className="h-4 w-4 text-primary" /> Revenue by course
        </h2>
        <DataTable
          columns={revenueColumns}
          data={byCourse}
          isLoading={data === null}
          loadingRows={3}
          searchPlaceholder="Search course…"
          exportFileName="revenue-by-course"
          initialSorting={[{ id: 'revenue', desc: true }]}
          pageSize={10}
          bodyClassName="max-h-96"
          emptyState={{
            icon: BarChart3,
            title: 'No sales data yet',
            description: 'Revenue per course will appear here once orders come in.',
          }}
        />
      </div>
    </AdminShell>
  )
}
