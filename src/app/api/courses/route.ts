import { handle } from '@/lib/api-helpers'
import { getPublishedCourses } from '@/lib/public-course'

export const GET = handle(async (req: Request) => {
  const url = new URL(req.url)
  const search = url.searchParams.get('search')?.trim() || undefined
  const category = url.searchParams.get('category')?.trim() || undefined
  const sortParam = url.searchParams.get('sort')
  const sort = (['newest', 'popular', 'priceLow', 'priceHigh'] as const).find((s) => s === sortParam)

  const courses = await getPublishedCourses({ search, categorySlug: category, sort })
  return Response.json({ courses })
})
