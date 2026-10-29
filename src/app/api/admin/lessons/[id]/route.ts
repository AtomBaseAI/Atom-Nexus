import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { lessonUpdateSchema } from '@/lib/validation'

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const data = await readBody(req, lessonUpdateSchema)

  if (data.sectionId) {
    const section = await db.section.findUnique({ where: { id: data.sectionId } })
    if (!section) return Response.json({ error: 'Target section not found' }, { status: 400 })
  }

  const lesson = await db.lesson.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.isPreview !== undefined ? { isPreview: data.isPreview } : {}),
      ...(data.order !== undefined ? { order: data.order } : {}),
      ...(data.sectionId !== undefined ? { sectionId: data.sectionId } : {}),
    },
  })
  return Response.json({ lesson: { id: lesson.id, title: lesson.title } })
})

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  await db.lesson.delete({ where: { id } })
  return Response.json({ ok: true })
})
