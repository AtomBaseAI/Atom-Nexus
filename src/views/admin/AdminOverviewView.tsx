'use client'

import { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CircleAlert,
  FilePlus2,
  GraduationCap,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
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
import { api } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { useI18n } from '@/i18n'
import { useNavStore } from '@/stores/nav-store'
import { cn } from '@/lib/utils'
import { AdminShell } from './AdminShell'
import { GlassCard } from '@/components/shared/GlassCard'
import { PaymentStatusBadge } from '@/components/shared/PaymentStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ListSkeleton, StatGridSkeleton } from '@/components/shared/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type AdminStats = {
  learners: number
  publishedCourses: number
  totalCourses?: number
  lessons?: number
  enrollments: number
  grossRevenue?: number
  grossRevenueLabel?: string
  successfulPayments?: number
  refundTotal?: number
  refundTotalLabel?: string
}

type RecentPurchase = {
  id: string
  courseTitle: string
  learnerName: string
  learnerEmail: string
  amount: number
  status: string
  createdAt: string
}

type PopularCourse = {
  id: string
  title: string
  slug?: string
  thumbnailUrl?: string
  status?: string
  priceAmount?: number
  learners: number
}

type RecentLearner = { id: string; name: string; email: string; createdAt: string }

type ProcessingProblem = {
  id: string
  lessonTitle: string
  courseTitle: string
  processingStatus: string
  hint?: string
}

type StatsResponse = {
  stats: AdminStats
  recentPurchases?: RecentPurchase[]
  popularCourses?: PopularCourse[]
  recentLearners?: RecentLearner[]
  processingProblems?: ProcessingProblem[]
}

type AnalyticsDay = {
  date: string
  label: string
  enrollments: number
  sales?: number
  revenue: number
}

type RevenueByCourseEntry = {
  id: string
  title: string
  slug?: string
  revenue: number
  revenueLabel?: string
  orders: number
}

type AnalyticsResponse = {
  days?: AnalyticsDay[]
  revenueByCourse?: RevenueByCourseEntry[]
  rates?: { paymentFailureRate?: number; refundTotal?: number; lessonCompletionRate?: number }
}

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

/** Fallback used when an endpoint fails — page renders with zeros instead of skeletons. */
const EMPTY_STATS: StatsResponse = {
  stats: {
    learners: 0,
    publishedCourses: 0,
    totalCourses: 0,
    lessons: 0,
    enrollments: 0,
    grossRevenue: 0,
    successfulPayments: 0,
    refundTotal: 0,
  },
}

const EMPTY_ANALYTICS: AnalyticsResponse = {
  days: [],
  revenueByCourse: [],
  rates: { paymentFailureRate: 0, refundTotal: 0, lessonCompletionRate: 0 },
}

const TOOLTIP_STYLE = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
} as const

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const fmtNumber = (n: number) => n.toLocaleString('en-IN')

/** Compact INR for axis ticks: ₹1.2k / ₹3.4L / ₹1.2Cr (input: minor units). */
function compactINR(paise: number): string {
  const r = paise / 100
  const trim = (n: number, suffix: string) =>
    `₹${(Math.round(n * 10) / 10).toString().replace(/\.0$/, '')}${suffix}`
  if (Math.abs(r) >= 1_00_00_000) return trim(r / 1_00_00_000, 'Cr')
  if (Math.abs(r) >= 1_00_000) return trim(r / 1_00_000, 'L')
  if (Math.abs(r) >= 1_000) return trim(r / 1_000, 'k')
  return `₹${Math.round(r)}`
}

/** `{ pct }` when comparable, `'new'` when the previous week is flat-empty, null when no signal. */
type WeeklyDelta = { pct: number } | 'new' | null

function weeklyDelta(days: AnalyticsDay[], key: 'revenue' | 'enrollments'): WeeklyDelta {
  const last = days.slice(7).reduce((s, d) => s + d[key], 0)
  const prev = days.slice(0, 7).reduce((s, d) => s + d[key], 0)
  if (prev === 0) return last > 0 ? 'new' : null
  return { pct: Math.round(((last - prev) / prev) * 100) }
}

/* ------------------------------------------------------------------ */
/* Local building blocks                                               */
/* ------------------------------------------------------------------ */

type ChipTone = 'positive' | 'negative' | 'warn' | 'primary'

const CHIP_TONES: Record<ChipTone, string> = {
  positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  negative: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  primary: 'bg-primary-soft text-primary',
}

function Chip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold',
        CHIP_TONES[tone],
      )}
    >
      {children}
    </span>
  )
}

function DeltaChip({ delta, label }: { delta: WeeklyDelta; label: string }) {
  if (!delta) return null
  if (delta === 'new') return <Chip tone="primary">New</Chip>
  const up = delta.pct >= 0
  return (
    <Chip tone={up ? 'positive' : 'negative'}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? '+' : ''}
      {delta.pct}% <span className="font-medium">{label}</span>
    </Chip>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
}: {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  delta?: React.ReactNode
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Icon className="h-4.5 w-4.5" size={18} />
        </div>
        {delta}
      </div>
      <p className="mt-3 truncate text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{label}</p>
      {sub ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p> : null}
    </GlassCard>
  )
}

function CardHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        {fmtNumber(count)}
      </span>
    </div>
  )
}

/** Subtle fade-up used to stagger page sections. */
function FadeIn({
  delay = 0,
  className,
  children,
}: {
  delay?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

const kpiContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const kpiItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export function AdminOverviewView() {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)

  const [statsData, setStatsData] = useState<StatsResponse | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Both endpoints in parallel; on failure fall back to empty data (zeros), never stuck skeletons.
    Promise.all([
      api.get<StatsResponse>('/api/admin/stats'),
      api.get<AnalyticsResponse>('/api/admin/analytics'),
    ])
      .then(([s, a]) => {
        if (cancelled) return
        setStatsData(s)
        setAnalytics(a)
      })
      .catch(() => {
        if (cancelled) return
        setStatsData(EMPTY_STATS)
        setAnalytics(EMPTY_ANALYTICS)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = statsData?.stats
  const days = analytics?.days ?? []
  const purchases = statsData?.recentPurchases ?? []
  const popular = statsData?.popularCourses ?? []
  const learners = statsData?.recentLearners ?? []
  const problems = statsData?.processingProblems ?? []
  const byCourse = analytics?.revenueByCourse ?? []

  const revDelta = weeklyDelta(days, 'revenue')
  const enrollDelta = weeklyDelta(days, 'enrollments')
  const revTotal = days.reduce((s, d) => s + d.revenue, 0)
  const enrollTotal = days.reduce((s, d) => s + d.enrollments, 0)
  const maxCourseRevenue = byCourse.reduce((m, c) => Math.max(m, c.revenue), 0)
  const courseOrders = byCourse.reduce((s, c) => s + c.orders, 0)

  return (
    <AdminShell title="Overview">
      {/* ---------------- Header ---------------- */}
      <FadeIn>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('admin.overviewSub')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" onClick={() => navigate({ name: 'admin-analytics' })}>
              <BarChart3 className="h-4 w-4" />
              {t('admin.analytics')}
            </Button>
            <Button onClick={() => navigate({ name: 'admin-courses' })}>
              <FilePlus2 className="h-4 w-4" />
              New course
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* ---------------- KPI row ---------------- */}
      <FadeIn delay={0.06} className="mt-5">
        {loading ? (
          <StatGridSkeleton count={4} />
        ) : (
          <motion.div
            variants={kpiContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <motion.div variants={kpiItem}>
              <KpiCard
                icon={TrendingUp}
                label="Gross revenue"
                value={stats?.grossRevenueLabel ?? formatINR(stats?.grossRevenue ?? 0)}
                delta={<DeltaChip delta={revDelta} label={t('admin.vsPrevWeek')} />}
              />
            </motion.div>
            <motion.div variants={kpiItem}>
              <KpiCard
                icon={GraduationCap}
                label="Enrollments"
                value={fmtNumber(stats?.enrollments ?? 0)}
                delta={<DeltaChip delta={enrollDelta} label={t('admin.vsPrevWeek')} />}
              />
            </motion.div>
            <motion.div variants={kpiItem}>
              <KpiCard
                icon={Users}
                label="Learners"
                value={fmtNumber(stats?.learners ?? 0)}
                sub={`${fmtNumber(stats?.enrollments ?? 0)} total enrollments`}
              />
            </motion.div>
            <motion.div variants={kpiItem}>
              <KpiCard
                icon={CircleAlert}
                label="Processing issues"
                value={fmtNumber(problems.length)}
                delta={
                  problems.length === 0 ? (
                    <Chip tone="positive">All clear</Chip>
                  ) : (
                    <Chip tone="warn">Needs attention</Chip>
                  )
                }
              />
            </motion.div>
          </motion.div>
        )}
      </FadeIn>

      {/* ---------------- Charts row ---------------- */}
      <FadeIn delay={0.12} className="mt-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Revenue trend */}
          <GlassCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold tracking-tight">{t('admin.revenueTrend')}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('admin.last14')}</p>
              </div>
              <Chip tone="primary">{formatINR(revTotal)}</Chip>
            </div>
            {loading ? (
              <ListSkeleton rows={4} className="mt-4" />
            ) : days.length === 0 ? (
              <div className="mt-4 flex h-[260px] items-center justify-center rounded-md border bg-background/40">
                <p className="text-sm text-muted-foreground">No data for this period yet.</p>
              </div>
            ) : (
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={days} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      width={56}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => compactINR(Number(v))}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={{ color: 'var(--popover-foreground)', fontWeight: 600 }}
                      itemStyle={{ color: 'var(--popover-foreground)' }}
                      cursor={{ stroke: 'var(--border)' }}
                      formatter={(value) => formatINR(Number(value))}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      fill="url(#revGrad)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>

          {/* Enrollments trend */}
          <GlassCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold tracking-tight">{t('admin.enrollTrend')}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('admin.last14')}</p>
              </div>
              <span className="inline-flex items-center whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
                {fmtNumber(enrollTotal)}
              </span>
            </div>
            {loading ? (
              <ListSkeleton rows={4} className="mt-4" />
            ) : days.length === 0 ? (
              <div className="mt-4 flex h-[260px] items-center justify-center rounded-md border bg-background/40">
                <p className="text-sm text-muted-foreground">No data for this period yet.</p>
              </div>
            ) : (
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={days} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      width={56}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={{ color: 'var(--popover-foreground)', fontWeight: 600 }}
                      itemStyle={{ color: 'var(--popover-foreground)' }}
                      cursor={{ fill: 'var(--secondary)' }}
                      formatter={(value) => fmtNumber(Number(value))}
                    />
                    <Bar
                      dataKey="enrollments"
                      fill="var(--chart-2)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={26}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>
        </div>
      </FadeIn>

      {/* ---------------- Recent purchases | Popular courses ---------------- */}
      <FadeIn delay={0.18} className="mt-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <GlassCard className="p-5 xl:col-span-2">
            <CardHeader title="Recent purchases" count={purchases.length} />
            <div className="mt-3">
              {loading ? (
                <ListSkeleton rows={4} />
              ) : purchases.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No purchases yet.</p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {purchases.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-md border bg-background/60 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.courseTitle}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {p.learnerName} · {p.learnerEmail}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-bold">{formatINR(p.amount)}</span>
                        <span className="text-[11px] text-muted-foreground">{fmtDate(p.createdAt)}</span>
                      </div>
                      <PaymentStatusBadge status={p.status} className="shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <CardHeader title="Popular courses" count={popular.length} />
            <div className="mt-3">
              {loading ? (
                <ListSkeleton rows={4} />
              ) : popular.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No published courses yet.
                </p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {popular.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-md border bg-background/60 p-2.5 transition-colors hover:border-primary/30 hover:bg-background/80"
                    >
                      <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-secondary">
                        {c.thumbnailUrl ? (
                          <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</p>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {fmtNumber(c.learners)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </FadeIn>

      {/* ---------------- Recent learners | Processing problems ---------------- */}
      <FadeIn delay={0.24} className="mt-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <GlassCard className="p-5">
            <CardHeader title="Recent learners" count={learners.length} />
            <div className="mt-3">
              {loading ? (
                <ListSkeleton rows={4} />
              ) : learners.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No learners yet"
                  description="New learner sign-ups will appear here."
                  className="p-6"
                />
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {learners.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-3 rounded-md border bg-background/60 p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        {l.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{l.email}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {fmtDate(l.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <CardHeader title="Processing problems" count={problems.length} />
            <div className="mt-3">
              {loading ? (
                <ListSkeleton rows={4} />
              ) : problems.length === 0 ? (
                <EmptyState
                  icon={CircleAlert}
                  title="All media ready"
                  description="No stuck or failed video processing jobs."
                  className="p-6"
                />
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {problems.map((p) => (
                    <div key={p.id} className="rounded-md border bg-background/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{p.lessonTitle}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.courseTitle}</p>
                        </div>
                        <PaymentStatusBadge status={p.processingStatus} className="shrink-0" />
                      </div>
                      {p.hint && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span>{p.hint}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </FadeIn>

      {/* ---------------- Revenue by course ---------------- */}
      <FadeIn delay={0.3} className="mt-4">
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight">{t('admin.revenueByCourse')}</h2>
            {courseOrders > 0 && (
              <span className="text-xs text-muted-foreground">
                {fmtNumber(courseOrders)} {courseOrders === 1 ? 'order' : 'orders'}
              </span>
            )}
          </div>
          {loading ? (
            <ListSkeleton rows={4} className="mt-4" />
          ) : byCourse.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t('admin.noRevenue')}</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
              {byCourse.map((c) => {
                const pct =
                  maxCourseRevenue > 0
                    ? Math.max(2, Math.round((c.revenue / maxCourseRevenue) * 100))
                    : 0
                return (
                  <div key={c.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</p>
                      <span className="shrink-0 text-sm font-semibold">
                        {c.revenueLabel ?? formatINR(c.revenue)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {fmtNumber(c.orders)} {c.orders === 1 ? 'order' : 'orders'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      </FadeIn>
    </AdminShell>
  )
}
