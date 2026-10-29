import { db } from '@/lib/db'
import { handle, readBody, requireUser } from '@/lib/api-helpers'
import { verifyPaymentSchema } from '@/lib/validation'
import { verifyPaymentSignature, RAZORPAY_DEMO_MODE } from '@/lib/razorpay'

/**
 * Verify a Razorpay checkout callback.
 * 1. Verify the HMAC signature server-side (never trust the browser callback).
 * 2. In live mode, confirm the payment status/amount with the provider API.
 * 3. Mark the order PAID and create the enrollment in ONE transaction (idempotent).
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser()
  const body = await readBody(req, verifyPaymentSchema)

  const order = await db.order.findUnique({
    where: { razorpayOrderId: body.razorpayOrderId },
    include: { payments: true },
  })
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })
  if (order.userId !== user.id) return Response.json({ error: 'Order does not belong to you' }, { status: 403 })

  // Idempotency: already processed successfully.
  if (order.status === 'PAID') {
    return Response.json({ ok: true, alreadyProcessed: true, orderId: order.id })
  }
  if (order.status !== 'PENDING') {
    return Response.json({ error: `Order is not payable (status: ${order.status})` }, { status: 400 })
  }

  // 1. Signature verification (mandatory).
  const signatureValid = verifyPaymentSignature(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature)
  if (!signatureValid) {
    await db.order.update({ where: { id: order.id }, data: { status: 'FAILED' } }).catch(() => undefined)
    return Response.json({ error: 'Payment signature verification failed' }, { status: 400 })
  }

  // 2. Confirm with provider in live mode.
  let providerStatus = 'captured' // demo mode assumes captured (signature already proves gateway acceptance)
  if (!RAZORPAY_DEMO_MODE) {
    try {
      const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(body.razorpayPaymentId)}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
          ).toString('base64')}`,
        },
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const payment = (await res.json()) as { status: string; amount: number; order_id: string }
      if (payment.order_id !== body.razorpayOrderId) throw new Error('order mismatch')
      providerStatus = payment.status
      if (payment.amount !== order.totalAmount) throw new Error('amount mismatch')
      if (!['captured', 'authorized'].includes(providerStatus)) throw new Error(`not captured (${providerStatus})`)
    } catch (err) {
      console.error('[payments] provider verification failed:', err)
      return Response.json({ error: 'Could not confirm payment with the provider' }, { status: 400 })
    }
  }

  // 3. Transaction: order PAID + payment record + enrollment (idempotent).
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date(), razorpayPaymentId: body.razorpayPaymentId },
    })

    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: 'razorpay',
        providerPaymentId: body.razorpayPaymentId,
        amount: order.totalAmount,
        currency: order.currency,
        status: 'CAPTURED',
        capturedAt: new Date(),
      },
    })

    const existingEnrollment = await tx.enrollment.findUnique({
      where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
    })
    if (existingEnrollment) {
      if (existingEnrollment.status === 'REVOKED') {
        await tx.enrollment.update({ where: { id: existingEnrollment.id }, data: { status: 'ACTIVE' } })
      }
    } else {
      await tx.enrollment.create({
        data: { userId: order.userId, courseId: order.courseId, status: 'ACTIVE' },
      })
    }

    return updated
  })

  return Response.json({
    ok: true,
    orderId: result.id,
    status: result.status,
    providerStatus,
    courseId: order.courseId,
  })
})
