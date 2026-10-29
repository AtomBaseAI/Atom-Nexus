import { db } from '@/lib/db'
import { handle, requireAdmin } from '@/lib/api-helpers'

/**
 * Publish a course — blocked when required content is missing or videos are not ready.
 * Returns the list of validation problems so the admin editor can show them.
 */
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params

  const course = await db.course.findUnique({
    where: { id },
    include: {
      category: { select: { id: true } },
      sections: { include: { lessons: { select: { id: true, title: true, processingStatus: true } } } },
    },
  })
  if (!course) return Response.json({ error: 'Course not found' }, { status: 404 })

  const problems: string[] = []
  if (course.title.trim().length < 4) problems.push('Title must be at least 4 characters')
  if (course.shortDescription.trim().length < 20) problems.push('Short description must be at least 20 characters')
  if (!course.description.trim()) problems.push('Full description is required')
  if (!course.thumbnailUrl.trim()) problems.push('Thumbnail image is required')
  if (!course.categoryId) problems.push('Category is required')
  if (!course.isFree && course.priceAmount <= 0) problems.push('Price must be set for a paid course')

  const lessons = course.sections.flatMap((s) => s.lessons)
  if (course.sections.length === 0) problems.push('At least one section is required')
  if (lessons.length === 0) problems.push('At least one lesson is required')
  for (const lesson of lessons) {
    if (lesson.processingStatus !== 'READY') {
      problems.push(`Video for “${lesson.title}” is not ready (${lesson.processingStatus})`)
    }
  }

  if (problems.length > 0) {
    // The client surfaces problems by splitting the error message on newlines.
    return Response.json(
      { error: ['Course cannot be published yet:', ...problems].join('\n'), problems },
      { status: 422 }
    )
  }

  const updated = await db.course.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: course.publishedAt ?? new Date() },
  })

  return Response.json({ ok: true, status: updated.status })
})
