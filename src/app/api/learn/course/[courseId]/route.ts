import { db } from '@/lib/db'
import { handle, requireUser, requireEnrollment } from '@/lib/api-helpers'

/** Full learning view of a course the learner is enrolled in (or admin preview). */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ courseId: string }> }) => {
  const user = await requireUser()
  const { courseId } = await params

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              isPreview: true,
              durationSeconds: true,
              processingStatus: true,
            },
          },
        },
      },
    },
  })
  if (!course) return Response.json({ error: 'Course not found' }, { status: 404 })

  const isAdmin = user.role === 'ADMIN'
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  })
  const hasAccess = isAdmin || (enrollment && enrollment.status !== 'REVOKED')
  if (!hasAccess) return Response.json({ error: 'You do not have access to this course' }, { status: 403 })

  const progressRows = await db.lessonProgress.findMany({
    where: { userId: user.id, courseId },
    select: { lessonId: true, lastPositionSeconds: true, watchedSeconds: true, completedAt: true },
  })

  const lessons = course.sections.flatMap((s) => s.lessons)
  const completedCount = progressRows.filter((p) => p.completedAt).length

  return Response.json({
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription,
      thumbnailUrl: course.thumbnailUrl,
      level: course.level,
      category: course.category,
    },
    enrollment: enrollment
      ? { id: enrollment.id, status: enrollment.status, lastLessonId: enrollment.lastLessonId, enrolledAt: enrollment.enrolledAt.toISOString() }
      : null,
    sections: course.sections.map((s) => ({
      id: s.id,
      title: s.title,
      order: s.order,
      lessons: s.lessons.map((l) => {
        const p = progressRows.find((row) => row.lessonId === l.id)
        return {
          id: l.id,
          title: l.title,
          description: l.description,
          order: l.order,
          isPreview: l.isPreview,
          durationSeconds: l.durationSeconds,
          isReady: l.processingStatus === 'READY',
          locked: !hasAccess && !l.isPreview,
          progress: p
            ? {
                lastPositionSeconds: p.lastPositionSeconds,
                watchedSeconds: p.watchedSeconds,
                completed: Boolean(p.completedAt),
              }
            : null,
        }
      }),
    })),
    summary: {
      totalLessons: lessons.length,
      completedLessons: completedCount,
      percent: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0,
    },
  })
})
