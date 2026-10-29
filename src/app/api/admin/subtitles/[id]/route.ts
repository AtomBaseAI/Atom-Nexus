import { db } from '@/lib/db'
import { handle, requireAdmin } from '@/lib/api-helpers'

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  await db.lessonSubtitle.delete({ where: { id } })
  return Response.json({ ok: true })
})
