'use client'

import { useEffect, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  GraduationCap,
  Play,
  Receipt,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useI18n, type DictKey } from '@/i18n'
import { api } from '@/lib/api'
import { formatDuration } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useNavStore, type View } from '@/stores/nav-store'
import { LearnShell } from './LearnShell'
import { GlassCard } from '@/components/shared/GlassCard'
import { CourseCard, CourseGrid, type CourseCardData } from '@/components/shared/CourseCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { CourseGridSkeleton, ListSkeleton, StatGridSkeleton } from '@/components/shared/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

/* ------------------------------- types ------------------------------- */

type MyCourse = {
  enrollmentId: string
  status: string
  enrolledAt: string
  lastAccessedAt: string | null
  course: {
    id: string
    title: string
    slug: string
    thumbnailUrl: string
    shortDescription: string
    level: string
    category: { name: string; slug: string }
  }
  progress: {
    totalLessons: number
    completedLessons: number
    percent: number
    watchedSeconds: number
    resumeLessonId: string | null
    resumePositionSeconds: number
    isCompleted: boolean
  }
}

type ActivityDay = { date: string; label: string; lessonsCompleted: number; minutes: number }

type ActivityResponse = {
  days: ActivityDay[]
  streak: number
  weekMinutes: number
  prevWeekMinutes: number
}

/* ----------------------------- constants ----------------------------- */

const TILE_PRIMARY = 'bg-primary-soft text-primary'
const TILE_EMERALD = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
const TILE_AMBER = 'bg-amber-500/10 text-amber-600 dark:text-amber-400'

const RING_RADIUS = 55
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(38, 19, 69, 0.12)',
}

const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: 'var(--muted-foreground)',
  fontSize: 11,
  fontWeight: 500,
  marginBottom: 2,
}

const QUICK_ACTIONS: { icon: LucideIcon; labelKey: DictKey; view: View }[] = [
  { icon: BookOpen, labelKey: 'dash.myLearning', view: { name: 'learn-courses' } },
  { icon: Award, labelKey: 'dash.certificates', view: { name: 'learn-certificates' } },
  { icon: Receipt, labelKey: 'dash.orders', view: { name: 'learn-orders' } },
  { icon: User, labelKey: 'dash.profile', view: { name: 'learn-profile' } },
]

/* ------------------------------ helpers ------------------------------ */

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** 14 zero-filled days — keeps the chart renderable on fetch error. */
function zeroActivity(): ActivityResponse {
  const days: ActivityDay[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      lessonsCompleted: 0,
      minutes: 0,
    })
  }
  return { days, streak: 0, weekMinutes: 0, prevWeekMinutes: 0 }
}

function toCourseCardData(e: MyCourse): CourseCardData {
  return {
    ...e.course,
    priceAmount: 0,
    compareAtPrice: null,
    isFree: false,
    category: e.course.category,
    stats: { lessons: e.progress.totalLessons, durationSeconds: 0, learners: 0 },
    audioLanguages: [],
  }
}

/* ------------------------- local components -------------------------- */

/** Mount fade-up used to stagger dashboard sections. */
function FadeIn({ delay = 0, className, children }: { delay?: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}

/** Compact stat tile — KPI row only (shared StatCard kept untouched). */
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tileClass = TILE_PRIMARY,
  subClass,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  tileClass?: string
  subClass?: string
}) {
  return (
    <GlassCard className="flex items-start gap-3 p-4">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', tileClass)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-bold leading-tight tracking-tight">{value}</p>
        {sub ? <p className={cn('mt-0.5 truncate text-xs', subClass ?? 'text-muted-foreground')}>{sub}</p> : null}
      </div>
    </GlassCard>
  )
}

function AchievementRow({
  icon: Icon,
  tileClass,
  label,
  value,
  highlight,
}: {
  icon: LucideIcon
  tileClass: string
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={cn('flex min-h-11 items-center gap-3 rounded-md px-2', highlight && 'bg-amber-500/10')}>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', tileClass)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      <span className="shrink-0 text-sm font-semibold">{value}</span>
    </div>
  )
}

/* ------------------------------- view -------------------------------- */

export function LearnDashboardView() {
  const { t } = useI18n()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavStore((s) => s.navigate)
  const [courses, setCourses] = useState<MyCourse[] | null>(null)
  const [activity, setActivity] = useState<ActivityResponse | null>(null)
  const [now] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api
        .get<{ enrollments: MyCourse[] }>('/api/learn/my-courses')
        .then((r) => r.enrollments)
        .catch(() => [] as MyCourse[]),
      api.get<ActivityResponse>('/api/learn/activity').catch(() => zeroActivity()),
    ]).then(([courseList, activityData]) => {
      if (cancelled) return
      setCourses(courseList)
      setActivity(activityData)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loading = courses === null || activity === null

  const active = courses?.filter((e) => !e.progress.isCompleted) ?? []
  const completed = courses?.filter((e) => e.progress.isCompleted) ?? []
  const totalWatched = courses?.reduce((s, e) => s + e.progress.watchedSeconds, 0) ?? 0
  const lessonsDone = courses?.reduce((s, e) => s + e.progress.completedLessons, 0) ?? 0
  const overallPercent =
    courses && courses.length > 0
      ? Math.round(courses.reduce((s, e) => s + e.progress.percent, 0) / courses.length)
      : 0
  const hoursWatched = Math.round((totalWatched / 3600) * 10) / 10

  const weekMinutes = activity?.weekMinutes ?? 0
  const prevWeekMinutes = activity?.prevWeekMinutes ?? 0
  const streak = activity?.streak ?? 0
  const days: ActivityDay[] = activity?.days ?? []

  const deltaPct =
    prevWeekMinutes > 0
      ? Math.round(((weekMinutes - prevWeekMinutes) / prevWeekMinutes) * 100)
      : weekMinutes > 0
        ? 100
        : 0
  const deltaText = `${deltaPct > 0 ? '+' : deltaPct < 0 ? '−' : '±'}${Math.abs(deltaPct)}% vs last week`
  const deltaClass =
    deltaPct > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : deltaPct < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground'

  // Continue learning = most recently accessed active course.
  const continueCourse =
    active.length > 0
      ? [...active].sort(
          (a, b) => +new Date(b.lastAccessedAt ?? b.enrolledAt) - +new Date(a.lastAccessedAt ?? a.enrolledAt),
        )[0]
      : null

  const greeting = getGreeting(now.getHours())
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const isEmpty = !loading && courses !== null && courses.length === 0

  return (
    <LearnShell title={t('dash.overview')}>
      <MotionConfig reducedMotion="user">
        {/* ---------- 1. Header ---------- */}
        <FadeIn>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{greeting}</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{t('dash.welcome', { name: user?.name ?? 'learner' })}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <Button size="lg" className="primary-button w-full sm:w-auto" onClick={() => navigate({ name: 'catalog' })}>
                <Compass className="h-4 w-4" />
                {t('dash.explore')}
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => navigate({ name: 'learn-courses' })}>
                <BookOpen className="h-4 w-4" />
                {t('dash.myLearning')}
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* ---------- 2. KPI row ---------- */}
        <FadeIn delay={0.05} className="mt-5">
          {loading ? (
            <StatGridSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard icon={BookOpen} label={t('dash.activeCourses')} value={active.length} sub={t('dash.inProgress')} />
              <KpiCard icon={CheckCircle2} label={t('dash.lessonsCompleted')} value={lessonsDone} sub="All time" />
              <KpiCard
                icon={Clock}
                label={t('dash.thisWeek')}
                value={weekMinutes}
                sub={deltaText}
                subClass={deltaClass}
                tileClass={TILE_EMERALD}
              />
              <KpiCard
                icon={Flame}
                label={t('dash.streak')}
                value={streak}
                sub={streak > 0 ? t('dash.keepGoing') : 'Start today'}
                tileClass={TILE_AMBER}
              />
            </div>
          )}
        </FadeIn>

        {/* ---------- 3. Main grid ---------- */}
        <FadeIn delay={0.1} className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {loading ? (
              <>
                <div className="flex flex-col gap-4 xl:col-span-2">
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-9 w-44" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="mt-4 h-[220px] w-full rounded-md" />
                  </GlassCard>
                  <CourseGridSkeleton count={4} />
                </div>
                <div className="flex flex-col gap-4">
                  <GlassCard className="p-5">
                    <Skeleton className="mx-auto h-[120px] w-[120px] rounded-full" />
                    <Skeleton className="mx-auto mt-4 h-4 w-36" />
                    <Skeleton className="mx-auto mt-3 h-8 w-48" />
                  </GlassCard>
                  <GlassCard className="p-5">
                    <ListSkeleton rows={3} />
                  </GlassCard>
                </div>
              </>
            ) : (
              <>
                {/* ----- Left column ----- */}
                <div className="flex flex-col gap-4 xl:col-span-2">
                  {/* 3a. Activity chart */}
                  <GlassCard className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-semibold tracking-tight">{t('dash.activity')}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t('dash.last14')}</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                        <Clock className="h-3.5 w-3.5" />
                        {weekMinutes} {t('dash.min')}
                      </span>
                    </div>
                    <div className="mt-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={days} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            tickLine={false}
                            axisLine={false}
                            width={32}
                            allowDecimals={false}
                          />
                          <Tooltip
                            cursor={{ fill: 'var(--primary)', fillOpacity: 0.06 }}
                            formatter={(value) => [`${Number(value)} ${t('dash.min')}`, t('dash.minutesWatched')]}
                            contentStyle={TOOLTIP_STYLE}
                            labelStyle={TOOLTIP_LABEL_STYLE}
                            itemStyle={{ color: 'var(--popover-foreground)', fontSize: 12, padding: 0 }}
                          />
                          <Bar dataKey="minutes" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  {/* 3b. Continue learning hero */}
                  {continueCourse && (
                    <GlassCard className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="aspect-video w-full shrink-0 overflow-hidden rounded-md bg-secondary sm:w-60">
                          <img
                            src={continueCourse.course.thumbnailUrl}
                            alt={continueCourse.course.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                            {t('dash.continueLearning')}
                          </p>
                          <h3 className="mt-1 text-lg font-bold tracking-tight">{continueCourse.course.title}</h3>
                          <div className="mt-2.5 flex items-center gap-3">
                            <Progress value={continueCourse.progress.percent} className="h-1.5 flex-1" />
                            <span className="shrink-0 text-xs font-semibold text-primary">
                              {continueCourse.progress.percent}%
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {continueCourse.progress.completedLessons}/{continueCourse.progress.totalLessons}{' '}
                            {t('course.lessons')}
                            <span className="mx-1.5">·</span>
                            {formatDuration(continueCourse.progress.watchedSeconds)} watched
                          </p>
                        </div>
                        <div className="shrink-0">
                          <Button
                            size="lg"
                            className="primary-button w-full sm:w-auto"
                            onClick={() =>
                              navigate({
                                name: 'player',
                                courseId: continueCourse.course.id,
                                lessonId: continueCourse.progress.resumeLessonId ?? undefined,
                              })
                            }
                          >
                            <Play className="h-4 w-4" />
                            {continueCourse.progress.completedLessons === 0 ? t('dash.start') : t('dash.resume')}
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* 3c. Active courses — or empty state when nothing enrolled */}
                  {isEmpty ? (
                    <EmptyState
                      icon={BookOpen}
                      title={t('dash.noCourses.title')}
                      description={t('dash.noCourses.desc')}
                      action={
                        <Button className="primary-button" onClick={() => navigate({ name: 'catalog' })}>
                          {t('dash.browseCourses')}
                        </Button>
                      }
                    />
                  ) : (
                    active.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h2 className="text-lg font-semibold tracking-tight">{t('dash.enrolledCourses')}</h2>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:bg-primary-soft hover:text-primary"
                            onClick={() => navigate({ name: 'learn-courses' })}
                          >
                            {t('common.viewAll')} →
                          </Button>
                        </div>
                        <CourseGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                          {active.slice(0, 6).map((e) => (
                            <CourseCard
                              key={e.enrollmentId}
                              course={toCourseCardData(e)}
                              progress={{
                                percent: e.progress.percent,
                                completedLessons: e.progress.completedLessons,
                                totalLessons: e.progress.totalLessons,
                              }}
                            />
                          ))}
                        </CourseGrid>
                      </div>
                    )
                  )}
                </div>

                {/* ----- Right column ----- */}
                <div className="flex flex-col gap-4 xl:col-span-1">
                  {/* 3a. Overall progress ring */}
                  <GlassCard className="p-5">
                    <div className="relative mx-auto h-[120px] w-[120px]">
                      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                        <defs>
                          <linearGradient id="dash-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#7700ff" />
                            <stop offset="100%" stopColor="#a45cff" />
                          </linearGradient>
                        </defs>
                        <circle cx={60} cy={60} r={RING_RADIUS} fill="none" stroke="var(--secondary)" strokeWidth={10} />
                        <motion.circle
                          cx={60}
                          cy={60}
                          r={RING_RADIUS}
                          fill="none"
                          stroke="url(#dash-ring-gradient)"
                          strokeWidth={10}
                          strokeLinecap="round"
                          strokeDasharray={RING_CIRCUMFERENCE}
                          initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                          animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - overallPercent / 100) }}
                          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-2xl font-bold leading-none tracking-tight">{overallPercent}%</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{t('dash.overallProgress')}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-8 border-t pt-4">
                      <div className="text-center">
                        <p className="text-lg font-bold leading-none tracking-tight">{completed.length}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{t('dash.completedCourses')}</p>
                      </div>
                      <span className="h-8 w-px bg-border" aria-hidden />
                      <div className="text-center">
                        <p className="text-lg font-bold leading-none tracking-tight">{lessonsDone}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{t('dash.lessonsCompleted')}</p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* 3b. Achievements */}
                  <GlassCard className="p-5">
                    <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                      <Award className="h-4 w-4 text-primary" />
                      {t('dash.achievements')}
                    </h2>
                    <div className="mt-3 space-y-1">
                      <AchievementRow
                        icon={GraduationCap}
                        tileClass={TILE_PRIMARY}
                        label={t('dash.coursesCompleted')}
                        value={String(completed.length)}
                      />
                      <AchievementRow
                        icon={Clock}
                        tileClass={TILE_EMERALD}
                        label={t('dash.hoursWatched')}
                        value={`${hoursWatched.toFixed(1)}h`}
                      />
                      <AchievementRow
                        icon={Flame}
                        tileClass={TILE_AMBER}
                        label={t('dash.streak')}
                        value={String(streak)}
                        highlight={streak > 0}
                      />
                    </div>
                  </GlassCard>

                  {/* 3c. Quick actions */}
                  <GlassCard className="p-5">
                    <h2 className="text-base font-semibold tracking-tight">{t('dash.quickActions')}</h2>
                    <div className="mt-3 space-y-1">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={action.labelKey}
                          type="button"
                          onClick={() => navigate(action.view)}
                          className="group flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <action.icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                          <span className="min-w-0 flex-1 truncate text-left">{t(action.labelKey)}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        </button>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              </>
            )}
          </div>
        </FadeIn>

        {/* ---------- 4. Completed courses ---------- */}
        {!loading && completed.length > 0 && (
          <FadeIn delay={0.15} className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold tracking-tight">{t('dash.completedCourses')}</h2>
            </div>
            <CourseGrid>
              {completed.map((e) => (
                <CourseCard
                  key={e.enrollmentId}
                  course={toCourseCardData(e)}
                  progress={{ percent: 100, completedLessons: e.progress.totalLessons, totalLessons: e.progress.totalLessons }}
                />
              ))}
            </CourseGrid>
          </FadeIn>
        )}
      </MotionConfig>
    </LearnShell>
  )
}
