import { db } from '@/lib/db'
import { handle, requireUser } from '@/lib/api-helpers'

/** Enroll in a free course (idempotent). Paid courses must go through payments. */
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  const { id } = await params

  const course = await db.course.findUnique({ where: { id }, select: { id: true, isFree: true, status: true } })
  if (!course || course.status !== 'PUBLISHED') {
    return Response.json({ error: 'Course is not available' }, { status: 404 })
  }
  if (!course.isFree) {
    return Response.json({ error: 'This course requires purchase' }, { status: 400 })
  }

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: id } },
  })
  if (existing && existing.status !== 'REVOKED') {
    return Response.json({ enrollment: { id: existing.id, status: existing.status }, alreadyEnrolled: true })
  }

  const enrollment = existing
    ? await db.enrollment.update({ where: { id: existing.id }, data: { status: 'ACTIVE' } })
    : await db.enrollment.create({ data: { userId: user.id, courseId: id, status: 'ACTIVE' } })

  return Response.json({ enrollment: { id: enrollment.id, status: enrollment.status }, alreadyEnrolled: false })
})
