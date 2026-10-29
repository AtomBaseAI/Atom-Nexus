'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { api } from '@/lib/api'
import { useNavStore } from '@/stores/nav-store'
import { useAuthStore } from '@/stores/auth-store'
import { usePurchase } from '@/hooks/use-purchase'
import { AppHeader } from '@/components/layout/AppHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { GlassCard } from '@/components/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { ListSkeleton } from '@/components/shared/LoadingSkeleton'
import { formatINR, formatDuration } from '@/lib/money'
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  GraduationCap,
  Infinity as InfinityIcon,
  Lock,
  PlayCircle,
  Users,
} from 'lucide-react'

type CourseDetail = {
  id: string
  title: string
  slug: string
  shortDescription: string
  description: string
  thumbnailUrl: string
  priceAmount: number
  compareAtPrice: number | null
  isFree: boolean
  level: string
  category: { id: string; name: string; slug: string }
  objectives: string[]
  prerequisites: string[]
  targetAudience: string[]
  publishedAt: string
  stats: { lessons: number; durationSeconds: number; learners: number }
  audioLanguages: { code: string; name: string }[]
  sections: {
    id: string
    title: string
    lessons: {
      id: string
      title: string
      description: string
      isPreview: boolean
      durationSeconds: number
      isReady: boolean
      audioLanguages: string[]
    }[]
  }[]
}

export function CourseDetailView({ slug }: { slug: string }) {
  const { t, locale } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const { startPurchase, checkoutModal } = usePurchase()
  // Keyed fetch result: loading and not-found are derived during render,
  // avoiding synchronous setState inside effects.
  const [courseResult, setCourseResult] = useState<{ key: string; course: CourseDetail | null; failed: boolean }>({
    key: slug,
    course: null,
    failed: false,
  })
  const course = courseResult.key === slug ? courseResult.course : null
  const notFound = courseResult.key === slug && courseResult.failed

  const enrollKey = user && course ? `${user.id}:${course.id}` : null
  const [enrollResult, setEnrollResult] = useState<{
    key: string
    enrollment: { courseId: string; resumeLessonId: string | null; percent: number; completedLessons: number; totalLessons: number } | null
  }>({ key: '', enrollment: null })
  const enrollment = enrollKey && enrollResult.key === enrollKey ? enrollResult.enrollment : null
  const enrollmentLoading = Boolean(enrollKey) && enrollResult.key !== enrollKey

  useEffect(() => {
    let cancelled = false
    api.get<{ course: CourseDetail }>(`/api/courses/${slug}`)
      .then((r) => {
        if (!cancelled) setCourseResult({ key: slug, course: r.course, failed: false })
      })
      .catch(() => {
        if (!cancelled) setCourseResult({ key: slug, course: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  // If logged in, check whether the learner already has access.
  useEffect(() => {
    if (!enrollKey) return
    let cancelled = false
    api
      .get<{ enrollments: { course: { id: string }; progress: { resumeLessonId: string | null; percent: number; completedLessons: number; totalLessons: number } }[] }>('/api/learn/my-courses')
      .then((r) => {
        if (cancelled) return
        const mine = r.enrollments.find((e) => e.course.id === enrollKey.split(':')[1])
        setEnrollResult({
          key: enrollKey,
          enrollment: mine
            ? { courseId: mine.course.id, resumeLessonId: mine.progress.resumeLessonId, percent: mine.progress.percent, completedLessons: mine.progress.completedLessons, totalLessons: mine.progress.totalLessons }
            : null,
        })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [enrollKey])

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <FileText className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold">{t('course.notFound.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('course.notFound.desc')}</p>
          <Button className="primary-button" onClick={() => navigate({ name: 'catalog' })}>
            {t('course.backToCatalog')}
          </Button>
        </main>
        <PublicFooter />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6">
          <ListSkeleton rows={6} />
        </main>
        <PublicFooter />
      </div>
    )
  }

  const isEnrolled = Boolean(enrollment)
  const totalAudio = course.audioLanguages.map((l) => l.name).join(', ')

  const handleCta = () => {
    if (isEnrolled) {
      navigate({ name: 'player', courseId: course.id, lessonId: enrollment?.resumeLessonId ?? undefined })
    } else if (!user) {
      navigate({ name: 'login' })
    } else {
      startPurchase({ id: course.id, slug: course.slug, title: course.title, isFree: course.isFree })
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      {checkoutModal}
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 sm:px-6">
        <button
          onClick={() => navigate({ name: 'catalog' })}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> {t('course.backToCatalog')}
        </button>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left column */}
          <div className="min-w-0 space-y-5">
            <GlassCard className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-primary-soft text-primary">{course.category.name}</Badge>
                <Badge variant="outline" className="bg-secondary">{t(`course.level.${course.level}` as never)}</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{course.title}</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{course.shortDescription}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><PlayCircle className="h-3.5 w-3.5" />{course.stats.lessons} {t('course.lessons')}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t('course.duration', { duration: formatDuration(course.stats.durationSeconds) })}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.stats.learners}</span>
                {course.audioLanguages.length > 0 && (
                  <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{t('course.audio')}: {totalAudio}</span>
                )}
              </div>
            </GlassCard>

            {course.objectives.length > 0 && (
              <GlassCard className="p-5">
                <h2 className="text-lg font-semibold tracking-tight">{t('course.objectives')}</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {course.objectives.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {o}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            <GlassCard className="p-5">
              <h2 className="text-lg font-semibold tracking-tight">{t('course.about')}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{course.description}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {course.prerequisites.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold">{t('course.prerequisites')}</h3>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {course.prerequisites.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
                {course.targetAudience.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold">{t('course.audience')}</h3>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {course.targetAudience.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Curriculum */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">{t('course.curriculum')}</h2>
                <span className="text-xs text-muted-foreground">
                  {t('course.sections', { sections: course.sections.length, lessons: course.stats.lessons })}
                </span>
              </div>
              <div className="mt-3 space-y-4">
                {course.sections.map((s, si) => (
                  <div key={s.id}>
                    <p className="text-sm font-semibold">
                      {t('course.section', { n: si + 1 })} · {s.title}
                    </p>
                    <ul className="mt-1.5 divide-y overflow-hidden rounded-md border">
                      {s.lessons.map((l, li) => {
                        const canWatch = l.isPreview || isEnrolled
                        return (
                          <li key={l.id} className="flex items-center justify-between gap-2 bg-white/50 px-3 py-2.5 text-sm dark:bg-transparent">
                            <span className="flex min-w-0 items-center gap-2">
                              {canWatch ? (
                                <button
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition-colors hover:bg-primary hover:text-white"
                                  aria-label={`${t('course.preview')}: ${l.title}`}
                                  onClick={() => navigate({ name: 'player', courseId: course.id, lessonId: l.id })}
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </button>
                              ) : (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                                  <Lock className="h-3.5 w-3.5" />
                                </span>
                              )}
                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {t('course.lecture', { n: li + 1 })}. {l.title}
                                </span>
                                {l.isPreview && !isEnrolled && (
                                  <Badge variant="outline" className="mt-0.5 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                                    {t('player.preview')}
                                  </Badge>
                                )}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatDuration(l.durationSeconds)}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Right column — purchase card */}
          <div className="lg:sticky lg:top-[70px] lg:h-fit">
            <GlassCard className="overflow-hidden p-0">
              <div className="aspect-video w-full overflow-hidden bg-secondary">
                { }
                <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-5">
                <div className="flex items-baseline gap-2">
                  {course.isFree ? (
                    <span className="text-3xl font-bold text-emerald-600">{t('common.free')}</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold tracking-tight">{formatINR(course.priceAmount, locale)}</span>
                      {course.compareAtPrice && course.compareAtPrice > course.priceAmount && (
                        <span className="text-sm text-muted-foreground line-through">{formatINR(course.compareAtPrice, locale)}</span>
                      )}
                    </>
                  )}
                </div>
                {!course.isFree && course.compareAtPrice && course.compareAtPrice > course.priceAmount && (
                  <Badge className="mt-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {Math.round((1 - course.priceAmount / course.compareAtPrice) * 100)}% off
                  </Badge>
                )}

                <Button
                  size="lg"
                  className="primary-button mt-4 w-full"
                  onClick={handleCta}
                  disabled={user ? false : false}
                >
                  {isEnrolled ? (
                    enrollmentLoading ? '…' : t('course.continue')
                  ) : !user ? (
                    t('course.loginToBuy')
                  ) : course.isFree ? (
                    t('course.enrollFree')
                  ) : (
                    t('course.buy')
                  )}
                </Button>

                {!isEnrolled && !user && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    <button className="text-primary hover:underline" onClick={() => navigate({ name: 'login' })}>
                      {t('nav.login')}
                    </button>{' '}
                    ·{' '}
                    <button className="text-primary hover:underline" onClick={() => navigate({ name: 'register' })}>
                      {t('nav.register')}
                    </button>
                  </p>
                )}

                <Separator className="my-4" />
                <p className="text-xs font-semibold text-muted-foreground">{t('course.includes')}</p>
                <ul className="mt-2 space-y-1.5 text-[13px]">
                  <li className="flex items-center gap-2"><InfinityIcon className="h-3.5 w-3.5 text-primary" /> {t('course.includesLifetime')}</li>
                  {course.audioLanguages.length > 0 && (
                    <li className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-primary" /> {t('course.includesAudio', { languages: totalAudio })}</li>
                  )}
                  <li className="flex items-center gap-2"><Award className="h-3.5 w-3.5 text-primary" /> {t('course.includesCertificate')}</li>
                  <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> {t('course.refundNote')}</li>
                </ul>
              </div>
            </GlassCard>

            {isEnrolled && (
              <GlassCard className="mt-4 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> {t('course.enrolled')}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{enrollment?.completedLessons ?? 0}/{enrollment?.totalLessons ?? 0} {t('course.lessons')}</span>
                  <span className="font-semibold text-primary">{enrollment?.percent ?? 0}%</span>
                </div>
                <Progress value={enrollment?.percent ?? 0} className="mt-2 h-1.5" />
              </GlassCard>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
