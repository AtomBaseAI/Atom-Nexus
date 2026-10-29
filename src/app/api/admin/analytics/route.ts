import { db } from '@/lib/db'
import { handle, requireAdmin } from '@/lib/api-helpers'
import { formatINR } from '@/lib/money'

const DAY_MS = 24 * 60 * 60 * 1000

/** Analytics: enrollment/sales by day, revenue by course, rates. */
export const GET = handle(async () => {
  await requireAdmin()

  const since = new Date(Date.now() - 13 * DAY_MS)
  since.setHours(0, 0, 0, 0)

  const [enrollments, paidOrders, refundRows, failedCount, totalCount, lessons, completions] = await Promise.all([
    db.enrollment.findMany({ where: { enrolledAt: { gte: since } }, select: { enrolledAt: true } }),
    db.order.findMany({
      where: { status: { in: ['PAID', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED'] }, createdAt: { gte: since } },
      select: { createdAt: true, totalAmount: true, courseId: true },
    }),
    db.refund.findMany({ where: { status: 'PROCESSED' }, select: { amount: true } }),
    db.order.count({ where: { status: 'FAILED' } }),
    db.order.count(),
    db.lesson.count(),
    db.lessonProgress.count({ where: { completedAt: { not: null } } }),
  ])

  const days: { date: string; label: string; enrollments: number; sales: number; revenue: number }[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * DAY_MS)
    const key = d.toISOString().slice(0, 10)
    days.push({
      date: key,
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      enrollments: 0,
      sales: 0,
      revenue: 0,
    })
  }
  for (const e of enrollments) {
    const key = e.enrolledAt.toISOString().slice(0, 10)
    const day = days.find((x) => x.date === key)
    if (day) day.enrollments += 1
  }
  for (const o of paidOrders) {
    const key = o.createdAt.toISOString().slice(0, 10)
    const day = days.find((x) => x.date === key)
    if (day) {
      day.sales += 1
      day.revenue += o.totalAmount
    }
  }

  // Revenue by course
  const ordersAll = await db.order.findMany({
    where: { status: { in: ['PAID', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED'] } },
    select: { totalAmount: true, courseId: true, course: { select: { title: true, slug: true } } },
  })
  const byCourse = new Map<string, { title: string; slug: string; revenue: number; orders: number }>()
  for (const o of ordersAll) {
    const entry = byCourse.get(o.courseId) ?? { title: o.course.title, slug: o.course.slug, revenue: 0, orders: 0 }
    entry.revenue += o.totalAmount
    entry.orders += 1
    byCourse.set(o.courseId, entry)
  }
  const revenueByCourse = [...byCourse.entries()]
    .map(([id, v]) => ({ id, ...v, revenueLabel: formatINR(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  return Response.json({
    days,
    revenueByCourse,
    rates: {
      paymentFailureRate: totalCount > 0 ? Math.round((failedCount / totalCount) * 100) : 0,
      refundTotal: refundRows.reduce((s, r) => s + r.amount, 0),
      lessonCompletionRate: lessons > 0 ? Math.round((completions / lessons) * 100) : 0,
    },
  })
})
