import { db } from '@/lib/db'

export type CourseListItem = {
  id: string
  title: string
  slug: string
  shortDescription: string
  thumbnailUrl: string
  priceAmount: number
  compareAtPrice: number | null
  isFree: boolean
  level: string
  language: string
  featured: boolean
  publishedAt: string
  category: { id: string; name: string; slug: string }
  stats: { lessons: number; durationSeconds: number; learners: number }
  audioLanguages: { code: string; name: string }[]
}

/** Public-facing shape for published courses (safe fields only). */
export function serializeCourse(course: {
  id: string
  title: string
  slug: string
  shortDescription: string
  thumbnailUrl: string
  priceAmount: number
  compareAtPrice: number | null
  isFree: boolean
  level: string
  language: string
  featured: boolean
  publishedAt: Date | null
  category: { id: string; name: string; slug: string }
  sections: { lessons: { durationSeconds: number; audioTracks: { languageCode: string; displayName: string }[] }[] }[]
  _count?: { enrollments?: number }
}): CourseListItem {
  const lessons = course.sections.flatMap((s) => s.lessons)
  const audioMap = new Map<string, string>()
  for (const lesson of lessons) {
    for (const t of lesson.audioTracks) {
      if (!audioMap.has(t.languageCode)) audioMap.set(t.languageCode, t.displayName)
    }
  }
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    shortDescription: course.shortDescription,
    thumbnailUrl: course.thumbnailUrl,
    priceAmount: course.priceAmount,
    compareAtPrice: course.compareAtPrice,
    isFree: course.isFree,
    level: course.level,
    language: course.language,
    featured: course.featured,
    publishedAt: (course.publishedAt ?? new Date()).toISOString(),
    category: course.category,
    stats: {
      lessons: lessons.length,
      durationSeconds: lessons.reduce((sum, l) => sum + l.durationSeconds, 0),
      learners: course._count?.enrollments ?? 0,
    },
    audioLanguages: [...audioMap.entries()].map(([code, name]) => ({ code, name })),
  }
}

const listInclude = {
  category: { select: { id: true, name: true, slug: true } },
  sections: {
    orderBy: { order: 'asc' as const },
    select: {
      lessons: {
        orderBy: { order: 'asc' as const },
        select: {
          durationSeconds: true,
          audioTracks: { select: { languageCode: true, displayName: true } },
        },
      },
    },
  },
  _count: { select: { enrollments: { where: { status: { not: 'REVOKED' } } } } },
}

export const courseListQuery = {
  include: listInclude,
}

export async function getPublishedCourses(opts: {
  search?: string
  categorySlug?: string
  sort?: 'newest' | 'popular' | 'priceLow' | 'priceHigh'
}) {
  const where = {
    status: 'PUBLISHED' as const,
    ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
    ...(opts.search
      ? {
          OR: [
            { title: { contains: opts.search } },
            { shortDescription: { contains: opts.search } },
            { description: { contains: opts.search } },
          ],
        }
      : {}),
  }

  const courses = await db.course.findMany({ where, ...courseListQuery })

  const items = courses.map(serializeCourse)
  switch (opts.sort) {
    case 'popular':
      items.sort((a, b) => b.stats.learners - a.stats.learners)
      break
    case 'priceLow':
      items.sort((a, b) => a.priceAmount - b.priceAmount)
      break
    case 'priceHigh':
      items.sort((a, b) => b.priceAmount - a.priceAmount)
      break
    default:
      items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  }
  return items
}
