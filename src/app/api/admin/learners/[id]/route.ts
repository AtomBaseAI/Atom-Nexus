import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { learnerUpdateSchema } from '@/lib/validation'

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const data = await readBody(req, learnerUpdateSchema)

  const user = await db.user.findUnique({ where: { id } })
  if (!user || user.role !== 'LEARNER') {
    return Response.json({ error: 'Learner not found' }, { status: 404 })
  }

  const updated = await db.user.update({ where: { id }, data: { status: data.status } })
  return Response.json({ learner: { id: updated.id, status: updated.status } })
})

/** Learner detail: enrollments + payments. */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params

  const user = await db.user.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
        },
      },
      orders: {
        include: { course: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!user || user.role !== 'LEARNER') return Response.json({ error: 'Learner not found' }, { status: 404 })

  const progressRows = await db.lessonProgress.groupBy({
    by: ['courseId'],
    where: { userId: id, completedAt: { not: null } },
    _count: true,
  })

  return Response.json({
    learner: {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      preferredLocale: user.preferredLocale,
      createdAt: user.createdAt.toISOString(),
    },
    enrollments: user.enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      enrolledAt: e.enrolledAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      completedLessons: progressRows.find((p) => p.courseId === e.courseId)?._count ?? 0,
      course: e.course,
    })),
    orders: user.orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      course: o.course,
    })),
  })
})
