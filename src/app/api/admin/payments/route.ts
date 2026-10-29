import { db } from '@/lib/db'
import { handle, requireAdmin } from '@/lib/api-helpers'

/** Admin payments view — internal orders joined with payments, refunds, learner, course. */
export const GET = handle(async (req: Request) => {
  await requireAdmin()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')?.trim()

  const STATUSES = ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED']
  const orders = await db.order.findMany({
    where: status && STATUSES.includes(status) ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, slug: true } },
      payments: { include: { refunds: true } },
    },
    take: 300,
  })

  return Response.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.totalAmount,
      currency: o.currency,
      razorpayOrderId: o.razorpayOrderId,
      razorpayPaymentId: o.razorpayPaymentId,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      learner: o.user, // contract key (frontend) — `user` kept as alias
      user: o.user,
      amount: o.totalAmount,
      course: o.course,
      payment: o.payments[0]
        ? {
            id: o.payments[0].id,
            status: o.payments[0].status,
            amount: o.payments[0].amount,
            method: o.payments[0].method,
            providerPaymentId: o.payments[0].providerPaymentId,
            capturedAt: o.payments[0].capturedAt?.toISOString() ?? null,
            refunds: o.payments[0].refunds.map((r) => ({
              id: r.id,
              providerRefundId: r.providerRefundId,
              amount: r.amount,
              status: r.status,
              createdAt: r.createdAt.toISOString(),
              completedAt: r.completedAt?.toISOString() ?? null,
            })),
          }
        : null,
    })),
  })
})
