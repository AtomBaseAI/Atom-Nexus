import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { sectionCreateSchema } from '@/lib/validation'

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const data = await readBody(req, sectionCreateSchema)

  const course = await db.course.findUnique({ where: { id }, select: { id: true } })
  if (!course) return Response.json({ error: 'Course not found' }, { status: 404 })

  const count = await db.section.count({ where: { courseId: id } })
  const section = await db.section.create({
    data: { courseId: id, title: data.title, order: count },
  })
  return Response.json({ section: { id: section.id, title: section.title, order: section.order } }, { status: 201 })
})
