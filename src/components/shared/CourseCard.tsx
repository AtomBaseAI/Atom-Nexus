'use client'

import { useI18n } from '@/i18n'
import { formatINR } from '@/lib/money'
import { useNavStore } from '@/stores/nav-store'
import { GlassCard } from '@/components/shared/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Clock, Globe, PlayCircle, Users } from 'lucide-react'
import { formatDuration } from '@/lib/money'
import { cn } from '@/lib/utils'

export type CourseCardData = {
  id: string
  title: string
  slug: string
  shortDescription: string
  thumbnailUrl: string
  priceAmount: number
  compareAtPrice: number | null
  isFree: boolean
  level: string
  featured?: boolean
  publishedAt?: string
  category: { name: string; slug: string }
  stats: { lessons: number; durationSeconds: number; learners: number }
  audioLanguages: { code: string; name: string }[]
}

/**
 * Course card used in landing/catalog/dashboard grids.
 * Optional `progress` renders an enrolled-state footer with resume CTA.
 */
export function CourseCard({
  course,
  progress,
  onOpen,
  className,
}: {
  course: CourseCardData
  progress?: { percent: number; completedLessons: number; totalLessons: number }
  onOpen?: (course: CourseCardData) => void
  className?: string
}) {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)

  const open = () => {
    if (onOpen) onOpen(course)
    else navigate({ name: 'course', slug: course.slug })
  }

  return (
    <GlassCard className={cn('group flex cursor-pointer flex-col overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg', className)} onClick={open}>
      <div className="relative aspect-video w-full overflow-hidden bg-secondary">
        {course.thumbnailUrl ? (
           
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
            <PlayCircle className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {course.featured && (
            <Badge className="border-0 bg-primary text-[10px] font-semibold text-primary-foreground">
              ★ {t('landing.featured')}
            </Badge>
          )}
          {course.isFree && (
            <Badge className="border-0 bg-emerald-600 text-[10px] font-semibold text-white">
              {t('common.free')}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span className="rounded bg-secondary px-1.5 py-0.5">{course.category.name}</span>
          <span className="rounded bg-secondary px-1.5 py-0.5">{t(`course.level.${course.level}` as never)}</span>
        </div>
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight group-hover:text-primary">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{course.shortDescription}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <PlayCircle className="h-3.5 w-3.5" /> {course.stats.lessons} {t('course.lessons')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {formatDuration(course.stats.durationSeconds)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {course.stats.learners}
          </span>
          {course.audioLanguages.length > 0 && (
            <span className="flex items-center gap-1" title={course.audioLanguages.map((l) => l.name).join(', ')}>
              <Globe className="h-3.5 w-3.5" /> {course.audioLanguages.length}
            </span>
          )}
        </div>

        {progress ? (
          <div className="mt-auto space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {progress.completedLessons}/{progress.totalLessons} {t('course.lessons')}
              </span>
              <span className="font-semibold text-primary">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-1.5" />
          </div>
        ) : (
          <div className="mt-auto flex items-end justify-between pt-2">
            <div className="flex items-baseline gap-1.5">
              {course.isFree ? (
                <span className="text-lg font-bold text-emerald-600">{t('common.free')}</span>
              ) : (
                <>
                  <span className="text-lg font-bold">{formatINR(course.priceAmount)}</span>
                  {course.compareAtPrice && course.compareAtPrice > course.priceAmount && (
                    <span className="text-xs text-muted-foreground line-through">{formatINR(course.compareAtPrice)}</span>
                  )}
                </>
              )}
            </div>
            <Button size="sm" variant="ghost" className="text-primary hover:bg-primary-soft hover:text-primary">
              {t('course.preview')} →
            </Button>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

export function CourseGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>{children}</div>
}
