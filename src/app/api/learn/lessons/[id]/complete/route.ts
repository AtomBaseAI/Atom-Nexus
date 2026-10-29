import { db } from '@/lib/db'
import { handle, requireUser } from '@/lib/api-helpers'

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  const { id } = await params

  const lesson = await db.lesson.findUnique({ where: { id }, select: { id: true, courseId: true } })
  if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 })

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
  })
  if (user.role !== 'ADMIN' && (!enrollment || enrollment.status === 'REVOKED')) {
    return Response.json({ error: 'No access to this lesson' }, { status: 403 })
  }

  const progress = await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: id } },
    create: { userId: user.id, lessonId: id, courseId: lesson.courseId, completedAt: new Date() },
    update: { completedAt: new Date() },
  })

  // Check whether the whole course is now complete.
  const courseLessons = await db.lesson.count({ where: { courseId: lesson.courseId } })
  const completedCount = await db.lessonProgress.count({
    where: { userId: user.id, courseId: lesson.courseId, completedAt: { not: null } },
  })
  let courseCompleted = false
  if (courseLessons > 0 && completedCount >= courseLessons) {
    courseCompleted = true
    await db.enrollment.updateMany({
      where: { userId: user.id, courseId: lesson.courseId, status: { not: 'REVOKED' } },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
  }

  return Response.json({
    completed: true,
    completedLessons: completedCount,
    totalLessons: courseLessons,
    courseCompleted,
  })
})
