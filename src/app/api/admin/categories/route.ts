import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { categoryCreateSchema, slugify } from '@/lib/validation'

export const GET = handle(async () => {
  await requireAdmin()
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { courses: true } } },
  })
  return Response.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, courseCount: c._count.courses })),
  })
})

export const POST = handle(async (req: Request) => {
  await requireAdmin()
  const data = await readBody(req, categoryCreateSchema)

  const slug = data.slug || slugify(data.name)
  if (!slug) return Response.json({ error: 'Could not derive a slug — provide one' }, { status: 400 })
  if (await db.category.findUnique({ where: { slug } })) {
    return Response.json({ error: 'A category with this slug already exists' }, { status: 409 })
  }

  const category = await db.category.create({ data: { name: data.name, slug } })
  return Response.json({ category: { id: category.id, name: category.name, slug: category.slug } }, { status: 201 })
})
