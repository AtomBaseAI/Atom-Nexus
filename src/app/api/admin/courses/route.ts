import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { courseCreateSchema, slugify } from '@/lib/validation'

export const GET = handle(async (req: Request) => {
  await requireAdmin()
  const url = new URL(req.url)
  const search = url.searchParams.get('search')?.trim()
  const status = url.searchParams.get('status')?.trim()

  const courses = await db.course.findMany({
    where: {
      ...(search ? { OR: [{ title: { contains: search } }, { slug: { contains: search } }] } : {}),
      ...(status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status) ? { status } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      sections: { select: { _count: { select: { lessons: true } } } },
      _count: { select: { enrollments: true } },
    },
  })

  return Response.json({
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      thumbnailUrl: c.thumbnailUrl,
      priceAmount: c.priceAmount,
      compareAtPrice: c.compareAtPrice,
      isFree: c.isFree,
      status: c.status,
      featured: c.featured,
      category: c.category,
      sectionCount: c.sections.length,
      lessonCount: c.sections.reduce((s, sec) => s + sec._count.lessons, 0),
      enrollmentCount: c._count.enrollments,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  })
})

export const POST = handle(async (req: Request) => {
  await requireAdmin()
  const data = await readBody(req, courseCreateSchema)

  // Ensure a unique slug.
  let slug = data.slug || slugify(data.title) || `course-${Date.now()}`
  if (await db.course.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const categoryExists = await db.category.findUnique({ where: { id: data.categoryId } })
  if (!categoryExists) return Response.json({ error: 'Category not found' }, { status: 400 })

  const course = await db.course.create({
    data: {
      title: data.title,
      slug,
      shortDescription: data.shortDescription ?? '',
      description: data.description ?? '',
      thumbnailUrl: data.thumbnailUrl ?? '',
      categoryId: data.categoryId,
      level: data.level ?? 'BEGINNER',
      language: data.language ?? 'en',
      objectives: JSON.stringify(data.objectives ?? []),
      prerequisites: JSON.stringify(data.prerequisites ?? []),
      targetAudience: JSON.stringify(data.targetAudience ?? []),
    },
  })

  return Response.json({ course: { id: course.id, title: course.title, slug: course.slug } }, { status: 201 })
})
