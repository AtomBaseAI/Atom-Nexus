import { db } from '@/lib/db'
import { handle, requireAdmin } from '@/lib/api-helpers'

/** Unpublish (PUBLISHED or ARCHIVED → DRAFT). Published-only enrollment access is kept. */
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const course = await db.course.findUnique({ where: { id }, select: { id: true } })
  if (!course) return Response.json({ error: 'Course not found' }, { status: 404 })
  const updated = await db.course.update({ where: { id }, data: { status: 'DRAFT' } })
  return Response.json({ ok: true, status: updated.status })
})
