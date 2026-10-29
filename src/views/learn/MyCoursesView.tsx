'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { api } from '@/lib/api'
import { useNavStore } from '@/stores/nav-store'
import { LearnShell } from './LearnShell'
import { CourseCard, CourseGrid, type CourseCardData } from '@/components/shared/CourseCard'
import { CourseGridSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { BookOpen, Play } from 'lucide-react'

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
    resumeLessonId: string | null
    isCompleted: boolean
  }
}

export function MyCoursesView() {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const [courses, setCourses] = useState<MyCourse[] | null>(null)

  useEffect(() => {
    api
      .get<{ enrollments: MyCourse[] }>('/api/learn/my-courses')
      .then((r) => setCourses(r.enrollments))
      .catch(() => setCourses([]))
  }, [])

  const open = (e: MyCourse) =>
    navigate({ name: 'player', courseId: e.course.id, lessonId: e.progress.resumeLessonId ?? undefined })

  return (
    <LearnShell title={t('dash.myLearning')}>
      <h1 className="text-2xl font-bold tracking-tight">{t('dash.myLearning')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('dash.enrolledCourses')}</p>

      <div className="mt-5">
        {courses === null ? (
          <CourseGridSkeleton count={4} />
        ) : courses.length === 0 ? (
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
          <CourseGrid>
            {courses.map((e) => (
              <div key={e.enrollmentId} className="flex flex-col gap-2">
                <CourseCard
                  course={
                    {
                      ...e.course,
                      priceAmount: 0,
                      compareAtPrice: null,
                      isFree: false,
                      category: e.course.category,
                      stats: { lessons: e.progress.totalLessons, durationSeconds: 0, learners: 0 },
                      audioLanguages: [],
                    } as CourseCardData
                  }
                  progress={{ percent: e.progress.percent, completedLessons: e.progress.completedLessons, totalLessons: e.progress.totalLessons }}
                />
                <Button size="sm" variant="outline" className="w-full" onClick={() => open(e)}>
                  <Play className="mr-1 h-3.5 w-3.5 text-primary" />
                  {e.progress.isCompleted ? t('dash.viewCourse') : e.progress.percent > 0 ? t('dash.resume') : t('dash.start')}
                </Button>
              </div>
            ))}
          </CourseGrid>
        )}
      </div>
    </LearnShell>
  )
}
