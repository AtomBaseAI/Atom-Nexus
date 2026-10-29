import { db } from '@/lib/db'
import { handle } from '@/lib/api-helpers'

export const GET = handle(async () => {
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { courses: { where: { status: 'PUBLISHED' } } } } },
  })
  return Response.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      courseCount: c._count.courses,
      createdAt: c.createdAt.toISOString(),
    })),
  })
})
