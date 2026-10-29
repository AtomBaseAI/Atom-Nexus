import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { sectionUpdateSchema } from '@/lib/validation'

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const data = await readBody(req, sectionUpdateSchema)
  const section = await db.section.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.order !== undefined ? { order: data.order } : {}),
    },
  })
  return Response.json({ section: { id: section.id, title: section.title, order: section.order } })
})

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  await db.section.delete({ where: { id } })
  return Response.json({ ok: true })
})
