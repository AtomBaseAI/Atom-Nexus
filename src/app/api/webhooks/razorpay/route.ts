import { db } from '@/lib/db'
import { handle } from '@/lib/api-helpers'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { RAZORPAY_DEMO_MODE } from '@/lib/razorpay'

type RazorpayWebhook = {
  event?: string
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; status?: string; amount?: number } }
    refund?: { entity?: { id?: string; payment_id?: string; status?: string; amount?: number } }
  }
}

/**
 * Razorpay webhook receiver.
 * - Verifies the HMAC signature against the RAW body (mandatory).
 * - Deduplicates events via WebhookEvent.providerEventId.
 * - Idempotent: captured payments and refunds can arrive multiple times / out of order.
 */
export const POST = handle(async (req: Request) => {
  const raw = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''
  const eventId = req.headers.get('x-razorpay-event-id') ?? `evt_${raw.length}_${signature.slice(0, 16)}`

  // In demo mode a local default secret is used so the endpoint is testable.
  if (!verifyWebhookSignature(raw, signature)) {
    return Response.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  let event: RazorpayWebhook
  try {
    event = JSON.parse(raw) as RazorpayWebhook
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Deduplicate
  const dupe = await db.webhookEvent.findUnique({ where: { providerEventId: eventId } })
  if (dupe) return Response.json({ ok: true, deduplicated: true })

  await db.webhookEvent.create({
    data: { provider: 'razorpay', providerEventId: eventId, eventType: event.event ?? 'unknown', payload: raw.slice(0, 8000) },
  })

  const paymentEntity = event.payload?.payment?.entity
  const refundEntity = event.payload?.refund?.entity

  if (event.event === 'payment.captured' && paymentEntity?.order_id) {
    const order = await db.order.findUnique({ where: { razorpayOrderId: paymentEntity.order_id } })
    if (order && order.status === 'PENDING') {
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'PAID', paidAt: new Date(), razorpayPaymentId: paymentEntity.id ?? order.razorpayPaymentId },
        })
        const existingPayment = await tx.payment.findUnique({
          where: { providerPaymentId: paymentEntity.id ?? `wh_${order.id}` },
        })
        if (!existingPayment) {
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: 'razorpay',
              providerPaymentId: paymentEntity.id ?? `wh_${order.id}`,
              amount: paymentEntity.amount ?? order.totalAmount,
              currency: order.currency,
              status: 'CAPTURED',
              capturedAt: new Date(),
            },
          })
        }
        const existingEnrollment = await tx.enrollment.findUnique({
          where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
        })
        if (!existingEnrollment) {
          await tx.enrollment.create({ data: { userId: order.userId, courseId: order.courseId, status: 'ACTIVE' } })
        } else if (existingEnrollment.status === 'REVOKED') {
          await tx.enrollment.update({ where: { id: existingEnrollment.id }, data: { status: 'ACTIVE' } })
        }
      })
    }
  }

  if (event.event === 'payment.failed' && paymentEntity?.order_id) {
    const order = await db.order.findUnique({ where: { razorpayOrderId: paymentEntity.order_id } })
    if (order && order.status === 'PENDING') {
      await db.order.update({ where: { id: order.id }, data: { status: 'FAILED' } })
    }
  }

  if (event.event === 'refund.processed' && refundEntity?.payment_id) {
    const payment = await db.payment.findUnique({ where: { providerPaymentId: refundEntity.payment_id } })
    if (payment) {
      const existingRefund = await db.refund.findUnique({ where: { providerRefundId: refundEntity.id ?? `wh_${payment.id}` } })
      if (existingRefund && existingRefund.status !== 'PROCESSED') {
        await db.refund.update({ where: { id: existingRefund.id }, data: { status: 'PROCESSED', completedAt: new Date() } })
      }
      await db.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } })
      await db.order.update({
        where: { id: payment.orderId },
        data: { status: refundEntity.amount && refundEntity.amount < payment.amount ? 'PARTIALLY_REFUNDED' : 'REFUNDED' },
      })
      // Revoke access once refund is confirmed.
      const paymentOrder = await db.order.findUnique({ where: { id: payment.orderId } })
      if (paymentOrder) {
        await db.enrollment.updateMany({
          where: { userId: paymentOrder.userId, courseId: paymentOrder.courseId },
          data: { status: 'REVOKED' },
        })
      }
    }
  }

  void RAZORPAY_DEMO_MODE
  return Response.json({ ok: true })
})
