import { db } from '@/lib/db'
import { handle, requireUser } from '@/lib/api-helpers'

export const GET = handle(async () => {
  const user = await requireUser()
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
      payments: {
        select: {
          id: true,
          status: true,
          amount: true,
          refunds: { select: { id: true, status: true, amount: true } },
        },
      },
    },
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
      course: o.course,
      payments: o.payments.map((p) => ({
        id: p.id,
        status: p.status,
        amount: p.amount,
        refundedAmount: p.refunds.filter((r) => r.status === 'PROCESSED').reduce((s, r) => s + r.amount, 0),
      })),
    })),
  })
})
