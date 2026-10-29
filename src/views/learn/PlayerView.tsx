'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/i18n'
import { api } from '@/lib/api'
import { useNavStore } from '@/stores/nav-store'
import { useAuthStore } from '@/stores/auth-store'
import { LanguageSelector } from '@/components/shared/LanguageSelector'
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler'
import { GlassCard } from '@/components/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CoursePlayer, type PlaybackSource, type PlaybackSubtitle } from '@/components/video/CoursePlayer'
import { cn } from '@/lib/utils'
import { formatDuration, formatClock } from '@/lib/money'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  GraduationCap,
  ListVideo,
  Lock,
  PlayCircle,
} from 'lucide-react'

type CourseData = {
  course: { id: string; title: string; slug: string; shortDescription: string; thumbnailUrl: string; level: string; category: { name: string } }
  enrollment: { id: string; status: string; lastLessonId: string | null } | null
  sections: {
    id: string
    title: string
    order: number
    lessons: {
      id: string
      title: string
      description: string
      order: number
      isPreview: boolean
      durationSeconds: number
      isReady: boolean
      locked: boolean
      progress: { lastPositionSeconds: number; watchedSeconds: number; completed: boolean } | null
    }[]
  }[]
  summary: { totalLessons: number; completedLessons: number; percent: number }
}

type PlaybackData = {
  lesson: { id: string; title: string; description: string; isPreview: boolean; durationSeconds: number; sectionTitle: string }
  course: { id: string; title: string; slug: string }
  access: 'public-preview' | 'enrolled' | 'admin'
  playback: { mode: 'demo' | 'mux'; sources?: PlaybackSource[]; playbackId?: string; playbackToken?: string | null }
  subtitles: PlaybackSubtitle[]
  positionSeconds: number
  completed: boolean
}

export function PlayerView({ courseId, lessonId }: { courseId: string; lessonId?: string }) {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const [course, setCourse] = useState<CourseData | null>(null)
  const [playback, setPlayback] = useState<PlaybackData | null>(null)
  const [loadedCourseId, setLoadedCourseId] = useState<string | null>(null)
  const [playbackLessonId, setPlaybackLessonId] = useState<string | null>(null)
  const [needsAccess, setNeedsAccess] = useState(false)
  const [curriculumOpen, setCurriculumOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allLessons = useMemo(() => course?.sections.flatMap((s) => s.lessons) ?? [], [course])
  const currentLessonId = lessonId ?? playback?.lesson.id ?? course?.enrollment?.lastLessonId ?? allLessons[0]?.id
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId)
  const currentLesson = currentIndex >= 0 ? allLessons[currentIndex] : undefined

  // Loading flags are derived from the ids currently in flight, so no
  // synchronous setState is needed inside effects.
  const loadingCourse = loadedCourseId !== courseId
  const loadingPlayback = currentLessonId != null && playbackLessonId !== currentLessonId

  useEffect(() => {
    api
      .get<CourseData>(`/api/learn/course/${courseId}`)
      .then((r) => {
        setCourse(r)
        setNeedsAccess(false)
        setLoadedCourseId(courseId)
      })
      .catch(() => {
        setNeedsAccess(true)
        setLoadedCourseId(courseId)
      })
  }, [courseId])

  useEffect(() => {
    if (loadingCourse || !currentLessonId) return
    let cancelled = false
    api
      .post<PlaybackData>(`/api/lessons/${currentLessonId}/playback`)
      .then((r) => {
        if (cancelled) return
        setPlayback(r)
        setPlaybackLessonId(currentLessonId)
      })
      .catch((err) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : ''
        if (message.includes('Enroll') || message.includes('access')) setNeedsAccess(true)
        else {
          setPlaybackLessonId(currentLessonId)
          toast.error(message || t('common.error'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [loadingCourse, currentLessonId, t])

  const goLesson = (id: string) => {
    setCurriculumOpen(false)
    navigate({ name: 'player', courseId, lessonId: id })
  }

  const saveProgress = useCallback(
    (p: { position: number; watched: number; duration: number }) => {
      if (!currentLessonId || playback?.access === 'public-preview') return
      if (saveTimer.current) return // debounce: one in-flight save at a time
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null
        api.put(`/api/learn/lessons/${currentLessonId}/progress`, {
          lastPositionSeconds: Math.floor(p.position),
          watchedSeconds: Math.floor(p.watched),
          durationSeconds: Math.floor(p.duration),
        }).catch(() => undefined)
      }, 800)
    },
    [currentLessonId, playback?.access]
  )

  const markComplete = useCallback(async () => {
    if (!currentLessonId) return
    try {
      const res = await api.post<{ courseCompleted: boolean }>(`/api/learn/lessons/${currentLessonId}/complete`)
      toast.success(res.courseCompleted ? t('player.courseComplete') : t('player.lessonComplete'))
      setCourse((c) => {
        if (!c) return c
        return {
          ...c,
          sections: c.sections.map((s) => ({
            ...s,
            lessons: s.lessons.map((l) =>
              l.id === currentLessonId
                ? { ...l, progress: { lastPositionSeconds: l.progress?.lastPositionSeconds ?? 0, watchedSeconds: l.progress?.watchedSeconds ?? 0, completed: true } }
                : l
            ),
          })),
          summary: {
            ...c.summary,
            completedLessons: Math.min(c.summary.completedLessons + 1, c.summary.totalLessons),
            percent: c.summary.totalLessons ? Math.round((Math.min(c.summary.completedLessons + 1, c.summary.totalLessons) / c.summary.totalLessons) * 100) : 0,
          },
        }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'))
    }
  }, [currentLessonId, t])

  const handleComplete = useCallback(() => {
    if (!currentLesson || currentLesson.progress?.completed) return
    markComplete()
  }, [currentLesson, markComplete])

  const audioChanged = (name: string) => toast.info(t('player.audioChanged', { language: name }))
  const subtitleChanged = (name: string) => toast.info(t('player.subtitleChanged', { language: name }))

  if (loadingCourse) {
    return (
      <div className="flex min-h-screen flex-col">
        <PlayerTopBar title="" />
        <main className="mx-auto w-full max-w-[1440px] flex-1 animate-pulse px-4 py-5 sm:px-6">
          <div className="aspect-video w-full rounded-lg bg-secondary" />
          <div className="mt-4 h-6 w-2/3 rounded bg-secondary" />
        </main>
      </div>
    )
  }

  if (needsAccess || !course) {
    return (
      <div className="flex min-h-screen flex-col">
        <PlayerTopBar title="" />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
          <Lock className="h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">{t('player.locked')}</h1>
          <p className="max-w-md text-sm text-muted-foreground">{t('player.enrollPrompt')}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ name: 'catalog' })}>
              {t('catalog.title')}
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const isEnrolled = course.enrollment && course.enrollment.status !== 'REVOKED'
  const showPreviewBadge = playback?.access === 'public-preview'

  return (
    <div className="flex min-h-screen flex-col">
      <PlayerTopBar title={course.course.title} />

      <main className="mx-auto grid w-full max-w-[1440px] flex-1 gap-5 px-3 py-4 sm:px-5 lg:grid-cols-[1fr_340px]">
        {/* Player column */}
        <div className="min-w-0 space-y-4">
          <div className="relative">
            {loadingPlayback || !playback ? (
              <div className="aspect-video w-full animate-pulse rounded-lg bg-secondary" />
            ) : (
              <CoursePlayer
                key={playback.lesson.id}
                sources={playback.playback.sources ?? []}
                subtitles={playback.subtitles}
                initialPosition={playback.positionSeconds}
                completed={playback.completed || Boolean(currentLesson?.progress?.completed)}
                onProgress={saveProgress}
                onComplete={handleComplete}
                onAudioChanged={audioChanged}
                onSubtitleChanged={subtitleChanged}
                hasNext={currentIndex >= 0 && currentIndex < allLessons.length - 1}
                hasPrev={currentIndex > 0}
                onNext={() => allLessons[currentIndex + 1] && goLesson(allLessons[currentIndex + 1].id)}
                onPrev={() => allLessons[currentIndex - 1] && goLesson(allLessons[currentIndex - 1].id)}
              />
            )}
            {showPreviewBadge && (
              <div className="glass absolute -top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold text-primary">
                {t('player.preview')}
              </div>
            )}
          </div>

          {/* Lesson meta */}
          <GlassCard className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-primary">
                  {playback?.lesson.sectionTitle ?? (currentLesson ? course.sections.find((s) => s.lessons.some((l) => l.id === currentLesson.id))?.title : '')}
                </p>
                <h1 className="mt-0.5 text-lg font-bold leading-snug tracking-tight sm:text-xl">
                  {playback?.lesson.title ?? currentLesson?.title}
                </h1>
                {playback?.lesson.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{playback.lesson.description}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {playback && playback.subtitles.length > 0 && (
                  <span className="rounded bg-secondary px-2 py-1 text-[11px] text-muted-foreground">
                    CC: {playback.subtitles.map((s) => s.languageCode.toUpperCase()).join(', ')}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex <= 0}
                  onClick={() => allLessons[currentIndex - 1] && goLesson(allLessons[currentIndex - 1].id)}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" /> {t('player.prev')}
                </Button>
                <Button
                  variant={currentLesson?.progress?.completed ? 'outline' : 'default'}
                  size="sm"
                  onClick={currentLesson?.progress?.completed ? undefined : handleComplete}
                  disabled={currentLesson?.progress?.completed || !isEnrolled}
                  className={currentLesson?.progress?.completed ? 'pointer-events-none text-emerald-700 dark:text-emerald-400' : 'primary-button'}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  {currentLesson?.progress?.completed ? t('player.completed') : t('player.markComplete')}
                </Button>
                <Button
                  size="sm"
                  disabled={currentIndex < 0 || currentIndex >= allLessons.length - 1}
                  onClick={() => allLessons[currentIndex + 1] && goLesson(allLessons[currentIndex + 1].id)}
                  className="primary-button"
                >
                  {t('player.next')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              {/* Mobile curriculum toggle */}
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setCurriculumOpen((v) => !v)}>
                <ListVideo className="mr-1 h-4 w-4 text-primary" />
                {curriculumOpen ? t('player.collapse') : t('player.expand')}
              </Button>
            </div>

            {showPreviewBadge && !isEnrolled && (
              <div className="mt-4 flex flex-col items-start justify-between gap-2 rounded-md border border-primary/25 bg-primary-soft/60 p-3 sm:flex-row sm:items-center">
                <p className="text-sm text-foreground/80">{t('player.enrollPrompt')}</p>
                <Button size="sm" className="primary-button shrink-0" onClick={() => navigate({ name: 'course', slug: course.course.slug })}>
                  {t('course.buy')}
                </Button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Curriculum sidebar */}
        <aside className={cn('lg:sticky lg:top-[70px] lg:block lg:h-fit', curriculumOpen ? 'block' : 'hidden')}>
          <GlassCard className="overflow-hidden p-0">
            <div className="border-b bg-secondary/50 px-4 py-3">
              <p className="text-sm font-semibold">{t('player.curriculum')}</p>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {course.summary.completedLessons}/{course.summary.totalLessons} · {course.summary.percent}%
                </span>
                <span className="w-28">
                  <Progress value={course.summary.percent} className="h-1.5" />
                </span>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-2 lg:max-h-[calc(100vh-160px)]">
              {course.sections.map((section, si) => (
                <Collapsible key={section.id} defaultOpen={si === 0 || section.lessons.some((l) => l.id === currentLessonId)}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] font-semibold hover:bg-secondary">
                    <span className="min-w-0 truncate">
                      {si + 1}. {section.title}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform ui-expanded:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="mb-1.5 space-y-0.5">
                      {section.lessons.map((l) => {
                        const isCurrent = l.id === currentLessonId
                        return (
                          <li key={l.id}>
                            <button
                              onClick={() => goLesson(l.id)}
                              className={cn(
                                'flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                                isCurrent ? 'bg-primary-soft text-primary' : 'hover:bg-secondary'
                              )}
                            >
                              <span className="mt-0.5 shrink-0">
                                {l.progress?.completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                ) : isCurrent ? (
                                  <PlayCircle className="h-4 w-4 text-primary" />
                                ) : l.locked && !l.isPreview && !isEnrolled ? (
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/50" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={cn('block leading-snug', isCurrent && 'font-semibold')}>{l.title}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {formatDuration(l.durationSeconds)}
                                  {l.isPreview && !isEnrolled ? ` · ${t('player.preview')}` : ''}
                                  {l.progress && !l.progress.completed && l.progress.lastPositionSeconds > 0
                                    ? ` · ${t('player.resumeFrom', { time: formatClock(l.progress.lastPositionSeconds) })}`
                                    : ''}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </GlassCard>
        </aside>
      </main>
    </div>
  )
}

function PlayerTopBar({ title }: { title: string }) {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const back = useNavStore((s) => s.back)
  const user = useAuthStore((s) => s.user)
  return (
    <header className="glass-nav sticky top-0 z-40 flex h-14 items-center justify-between gap-2 px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button onClick={back} className="rounded-md p-2 hover:bg-secondary" aria-label={t('common.back')}>
          <ArrowLeft className="h-4.5 w-4.5" size={18} />
        </button>
        <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
        </button>
        <span className="truncate text-sm font-semibold">{title}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <LanguageSelector align="end" compact />
        <AnimatedThemeToggler />
        <button
          onClick={() => navigate({ name: user?.role === 'ADMIN' ? 'admin' : 'learn' })}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
          aria-label={t('nav.dashboard')}
        >
          {user?.name?.slice(0, 2).toUpperCase() ?? '?'}
        </button>
      </div>
    </header>
  )
}
