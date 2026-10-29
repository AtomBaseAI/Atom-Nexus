import { db } from '@/lib/db'
import { handle, requireAdmin } from '@/lib/api-helpers'

export const GET = handle(async (req: Request) => {
  await requireAdmin()
  const url = new URL(req.url)
  const courseId = url.searchParams.get('courseId')?.trim()

  const enrollments = await db.enrollment.findMany({
    where: courseId ? { courseId } : undefined,
    orderBy: { enrolledAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, status: true } },
      course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
    },
    take: 300,
  })

  const courseLessons = await db.lesson.groupBy({ by: ['courseId'], _count: true })

  return Response.json({
    enrollments: enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      enrolledAt: e.enrolledAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      learner: e.user, // contract key (frontend) — `user` kept as alias
      user: e.user,
      course: e.course,
      totalLessons: courseLessons.find((c) => c.courseId === e.courseId)?._count ?? 0,
    })),
  })
})
