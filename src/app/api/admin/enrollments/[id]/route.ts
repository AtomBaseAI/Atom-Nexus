import { db } from '@/lib/db'
import { handle, requireAdmin } from '@/lib/api-helpers'

/** Revoke an enrollment (removes course access). Audited via console + webhook log. */
export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params

  const enrollment = await db.enrollment.findUnique({ where: { id }, include: { course: { select: { title: true } } } })
  if (!enrollment) return Response.json({ error: 'Enrollment not found' }, { status: 404 })

  await db.enrollment.update({ where: { id }, data: { status: 'REVOKED' } })
  console.log(`[audit] enrollment ${id} revoked by admin (course: ${enrollment.course.title})`)
  return Response.json({ ok: true })
})
