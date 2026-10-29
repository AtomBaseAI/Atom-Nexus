import { db } from '@/lib/db'
import { handle, requireUser } from '@/lib/api-helpers'

type MyCourseRow = {
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

export const GET = handle(async () => {
  const user = await requireUser()

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id, status: { not: 'REVOKED' } },
    orderBy: { enrolledAt: 'desc' },
    include: {
      course: {
        include: {
          category: { select: { name: true, slug: true } },
          sections: { select: { lessons: { select: { id: true, durationSeconds: true } } } },
        },
      },
    },
  })

  const progress = await db.lessonProgress.findMany({
    where: { userId: user.id },
    select: { lessonId: true, courseId: true, lastPositionSeconds: true, watchedSeconds: true, completedAt: true },
  })

  const result: MyCourseRow[] = []
  for (const e of enrollments) {
    const lessons = e.course.sections.flatMap((s) => s.lessons)
    const lessonIds = new Set(lessons.map((l) => l.id))
    const mine = progress.filter((p) => p.courseId === e.course.id)
    const completed = mine.filter((p) => p.completedAt).length
    const watchedSeconds = mine.reduce((sum, p) => sum + p.watchedSeconds, 0)
    // Find the lesson to resume: last accessed lesson if not complete, else next uncompleted.
    let resumeLessonId = e.lastLessonId
    const resumeProgress = resumeLessonId ? mine.find((p) => p.lessonId === resumeLessonId) : undefined
    if (resumeLessonId && resumeProgress?.completedAt) {
      resumeLessonId = lessons.find((l) => !mine.find((p) => p.lessonId === l.id && p.completedAt))?.id ?? lessons[0]?.id
    }
    if (!resumeLessonId || !lessonIds.has(resumeLessonId)) {
      resumeLessonId = lessons.find((l) => !mine.find((p) => p.lessonId === l.id && p.completedAt))?.id ?? lessons[0]?.id
    }

    result.push({
      enrollmentId: e.id,
      status: e.status,
      enrolledAt: e.enrolledAt.toISOString(),
      lastAccessedAt: e.lastAccessedAt?.toISOString() ?? null,
      course: {
        id: e.course.id,
        title: e.course.title,
        slug: e.course.slug,
        thumbnailUrl: e.course.thumbnailUrl,
        shortDescription: e.course.shortDescription,
        level: e.course.level,
        category: e.course.category,
      },
      progress: {
        totalLessons: lessons.length,
        completedLessons: completed,
        percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
        watchedSeconds,
        resumeLessonId: resumeLessonId ?? null,
        resumePositionSeconds: resumeLessonId ? (progress.find((p) => p.lessonId === resumeLessonId)?.lastPositionSeconds ?? 0) : 0,
        isCompleted: lessons.length > 0 && completed === lessons.length,
      },
    })
  }

  return Response.json({ enrollments: result })
})
