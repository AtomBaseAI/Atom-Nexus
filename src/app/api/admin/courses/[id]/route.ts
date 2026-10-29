import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { courseUpdateSchema } from '@/lib/validation'

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params

  const course = await db.course.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              audioTracks: true,
              subtitles: true,
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  })
  if (!course) return Response.json({ error: 'Course not found' }, { status: 404 })

  return Response.json({
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      priceAmount: course.priceAmount,
      compareAtPrice: course.compareAtPrice,
      isFree: course.isFree,
      status: course.status,
      level: course.level,
      language: course.language,
      featured: course.featured,
      objectives: JSON.parse(course.objectives || '[]'),
      prerequisites: JSON.parse(course.prerequisites || '[]'),
      targetAudience: JSON.parse(course.targetAudience || '[]'),
      categoryId: course.categoryId,
      category: course.category,
      enrollmentCount: course._count.enrollments,
      updatedAt: course.updatedAt.toISOString(),
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
          videoSourceUrl: l.videoSourceUrl,
          muxAssetId: l.muxAssetId,
          muxPlaybackId: l.muxPlaybackId,
          processingStatus: l.processingStatus,
          durationSeconds: l.durationSeconds,
          lastProcessingError: l.lastProcessingError,
          audioTracks: l.audioTracks.map((t) => ({
            id: t.id,
            languageCode: t.languageCode,
            displayName: t.displayName,
            isPrimary: t.isPrimary,
            status: t.status,
          })),
          subtitles: l.subtitles.map((s) => ({
            id: s.id,
            languageCode: s.languageCode,
            displayName: s.displayName,
            status: s.status,
          })),
        })),
      })),
    },
  })
})

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const data = await readBody(req, courseUpdateSchema)

  const existing = await db.course.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!existing) return Response.json({ error: 'Course not found' }, { status: 404 })

  if (data.slug && data.slug !== existing.slug) {
    if (await db.course.findUnique({ where: { slug: data.slug } })) {
      return Response.json({ error: 'Slug already in use' }, { status: 409 })
    }
  }
  if (data.categoryId) {
    const cat = await db.category.findUnique({ where: { id: data.categoryId } })
    if (!cat) return Response.json({ error: 'Category not found' }, { status: 400 })
  }

  const course = await db.course.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.shortDescription !== undefined ? { shortDescription: data.shortDescription } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.thumbnailUrl !== undefined ? { thumbnailUrl: data.thumbnailUrl } : {}),
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      ...(data.level !== undefined ? { level: data.level } : {}),
      ...(data.language !== undefined ? { language: data.language } : {}),
      ...(data.featured !== undefined ? { featured: data.featured } : {}),
      ...(data.isFree !== undefined ? { isFree: data.isFree } : {}),
      ...(data.priceAmount !== undefined ? { priceAmount: data.priceAmount } : {}),
      ...(data.compareAtPrice !== undefined ? { compareAtPrice: data.compareAtPrice } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.objectives !== undefined ? { objectives: JSON.stringify(data.objectives) } : {}),
      ...(data.prerequisites !== undefined ? { prerequisites: JSON.stringify(data.prerequisites) } : {}),
      ...(data.targetAudience !== undefined ? { targetAudience: JSON.stringify(data.targetAudience) } : {}),
    },
  })

  return Response.json({ course: { id: course.id, slug: course.slug, status: course.status } })
})

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params

  const enrollmentCount = await db.enrollment.count({ where: { courseId: id } })
  if (enrollmentCount > 0) {
    return Response.json(
      { error: 'Course has enrollments — archive it instead of deleting' },
      { status: 409 }
    )
  }
  await db.course.delete({ where: { id } })
  return Response.json({ ok: true })
})
