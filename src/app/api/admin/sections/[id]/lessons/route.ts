import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { lessonCreateSchema } from '@/lib/validation'

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const data = await readBody(req, lessonCreateSchema)

  const section = await db.section.findUnique({ where: { id }, select: { id: true, courseId: true } })
  if (!section) return Response.json({ error: 'Section not found' }, { status: 404 })

  const count = await db.lesson.count({ where: { sectionId: id } })
  const lesson = await db.lesson.create({
    data: {
      sectionId: id,
      courseId: section.courseId,
      title: data.title,
      description: data.description ?? '',
      isPreview: data.isPreview ?? false,
      order: count,
    },
  })
  return Response.json({ lesson: { id: lesson.id, title: lesson.title, order: lesson.order } }, { status: 201 })
})
