import { db } from '@/lib/db'
import { handle } from '@/lib/api-helpers'
import { serializeCourse } from '@/lib/public-course'

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const course = await db.course.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              isPreview: true,
              durationSeconds: true,
              processingStatus: true,
              audioTracks: { select: { languageCode: true, displayName: true } },
            },
          },
        },
      },
      _count: { select: { enrollments: { where: { status: { not: 'REVOKED' } } } } },
    },
  })
  if (!course) return Response.json({ error: 'Course not found' }, { status: 404 })

  const serialized = serializeCourse(course)
  return Response.json({
    course: {
      ...serialized,
      description: course.description,
      objectives: JSON.parse(course.objectives || '[]') as string[],
      prerequisites: JSON.parse(course.prerequisites || '[]') as string[],
      targetAudience: JSON.parse(course.targetAudience || '[]') as string[],
      sections: course.sections.map((s) => ({
        id: s.id,
        title: s.title,
        order: s.order,
        lessons: s.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          order: l.order,
          isPreview: l.isPreview,
          durationSeconds: l.durationSeconds,
          isReady: l.processingStatus === 'READY',
          audioLanguages: l.audioTracks.map((t) => t.languageCode),
        })),
      })),
      subtitleLanguages: [...new Set(course.sections.flatMap((s) => s.lessons.flatMap(() => [])))],
    },
  })
})
