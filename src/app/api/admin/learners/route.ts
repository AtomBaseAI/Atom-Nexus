import { db } from '@/lib/db'
import { handle } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/api-helpers'

export const GET = handle(async (req: Request) => {
  await requireAdmin()
  const url = new URL(req.url)
  const search = url.searchParams.get('search')?.trim()

  const learners = await db.user.findMany({
    where: { role: 'LEARNER', ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}) },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enrollments: { where: { status: { not: 'REVOKED' } } } } },
      orders: { where: { status: 'PAID' }, select: { totalAmount: true } },
    },
  })

  return Response.json({
    learners: learners.map((l) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      status: l.status,
      preferredLocale: l.preferredLocale,
      createdAt: l.createdAt.toISOString(),
      enrollmentCount: l._count.enrollments,
      totalPaid: l.orders.reduce((s, o) => s + o.totalAmount, 0),
    })),
  })
})
