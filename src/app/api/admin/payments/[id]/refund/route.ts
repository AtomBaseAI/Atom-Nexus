import { db } from '@/lib/db'
import { handle, requireAdmin } from '@/lib/api-helpers'
import { createRazorpayRefund } from '@/lib/razorpay'
import { RAZORPAY_DEMO_MODE } from '@/lib/razorpay'

/**
 * Initiate a refund for a paid order (admin action).
 * The refund is created through the provider API and recorded locally with
 * PENDING status — it is only marked complete on confirmed notification
 * (or, in demo mode, immediately by the simulated gateway).
 * Access is revoked once the refund is confirmed.
 */
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params // internal order id

  const order = await db.order.findUnique({
    where: { id },
    include: { payments: { include: { refunds: true } } },
  })
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

  const payment = order.payments.find((p) => p.status === 'CAPTURED' || p.status === 'REFUNDED')
  if (!payment) {
    return Response.json({ error: 'Order has no captured payment to refund' }, { status: 400 })
  }
  if (order.status === 'REFUND_PENDING') {
    return Response.json({ error: 'A refund is already in progress for this order' }, { status: 409 })
  }
  if (order.status === 'REFUNDED') {
    return Response.json({ error: 'Order is already fully refunded' }, { status: 409 })
  }

  const refundedSoFar = payment.refunds
    .filter((r) => r.status === 'PROCESSED')
    .reduce((s, r) => s + r.amount, 0)
  const refundable = payment.amount - refundedSoFar
  if (refundable <= 0) {
    return Response.json({ error: 'Nothing left to refund' }, { status: 400 })
  }

  // Ask the provider to create the refund.
  const providerRefund = await createRazorpayRefund(payment.providerPaymentId, refundable)

  const confirmed = ['processed', 'completed'].includes(providerRefund.status)

  const refund = await db.refund.create({
    data: {
      paymentId: payment.id,
      providerRefundId: providerRefund.id,
      amount: refundable,
      status: confirmed ? 'PROCESSED' : 'PENDING',
      completedAt: confirmed ? new Date() : null,
    },
  })

  await db.order.update({
    where: { id: order.id },
    data: {
      status: confirmed ? 'REFUNDED' : 'REFUND_PENDING',
    },
  })

  await db.payment.update({
    where: { id: payment.id },
    data: { status: confirmed ? 'REFUNDED' : payment.status },
  })

  // Access revocation only after refund confirmation.
  if (confirmed) {
    await db.enrollment.updateMany({
      where: { userId: order.userId, courseId: order.courseId },
      data: { status: 'REVOKED' },
    })
  }

  console.log(`[audit] refund ${refund.id} for order ${order.id} initiated by admin (mode: ${RAZORPAY_DEMO_MODE ? 'demo' : 'live'})`)

  return Response.json({
    refund: {
      id: refund.id,
      providerRefundId: refund.providerRefundId,
      amount: refund.amount,
      status: refund.status,
    },
    orderStatus: confirmed ? 'REFUNDED' : 'REFUND_PENDING',
  })
})
