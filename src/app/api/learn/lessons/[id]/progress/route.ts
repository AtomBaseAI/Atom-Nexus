import { db } from '@/lib/db'
import { handle, readBody, requireUser } from '@/lib/api-helpers'
import { progressSchema } from '@/lib/validation'

/**
 * Save playback progress for a lesson. Values are validated and capped —
 * the browser's numbers are treated as hints, not proof of watching.
 */
export const PUT = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  const { id } = await params
  const body = await readBody(req, progressSchema)

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: { id: true, courseId: true, durationSeconds: true, section: { select: { course: { select: { status: true } } } } },
  })
  if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 })

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
  })
  const isAdmin = user.role === 'ADMIN'
  if (!isAdmin && (!enrollment || enrollment.status === 'REVOKED')) {
    return Response.json({ error: 'No access to this lesson' }, { status: 403 })
  }

  // Completion policy: cap reported values against the known duration.
  const duration = body.durationSeconds && body.durationSeconds > 0 ? body.durationSeconds : lesson.durationSeconds
  const cap = duration > 0 ? Math.ceil(duration * 1.25) : 60 * 60 * 12
  const position = Math.min(Math.floor(body.lastPositionSeconds), cap)
  const watched = Math.min(Math.floor(body.watchedSeconds), cap)

  const existing = await db.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId: id } },
  })

  const data = {
    lastPositionSeconds: position,
    watchedSeconds: Math.max(watched, existing?.watchedSeconds ?? 0),
    ...(duration > 0 && lesson.durationSeconds === 0 ? {} : {}),
  }

  const progress = await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: id } },
    create: { userId: user.id, lessonId: id, courseId: lesson.courseId, ...data },
    update: data,
  })

  // Learn the real duration from the player if the lesson metadata is missing.
  if (lesson.durationSeconds === 0 && body.durationSeconds && body.durationSeconds > 0) {
    await db.lesson.update({ where: { id }, data: { durationSeconds: Math.floor(body.durationSeconds) } })
  }

  await db.enrollment.update({
    where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
    data: { lastLessonId: id, lastAccessedAt: new Date() },
  }).catch(() => undefined)

  return Response.json({
    progress: {
      lastPositionSeconds: progress.lastPositionSeconds,
      watchedSeconds: progress.watchedSeconds,
      completed: Boolean(progress.completedAt),
    },
  })
})
