import { db } from '@/lib/db'
import { handle, readBody, requireUser } from '@/lib/api-helpers'
import { mockPaySchema } from '@/lib/validation'
import { simulateCheckoutSignature, RAZORPAY_DEMO_MODE } from '@/lib/razorpay'
import { randomBytes } from 'crypto'

/**
 * Demo-mode checkout simulator — plays the role of the Razorpay gateway.
 * Only available when real Razorpay keys are NOT configured.
 *  - success → returns payment_id + signature exactly like the real checkout,
 *    which the client then submits to /api/payments/verify.
 *  - failure → marks the order FAILED so the state machine stays consistent.
 */
export const POST = handle(async (req: Request) => {
  if (!RAZORPAY_DEMO_MODE) {
    return Response.json({ error: 'Not available in live payment mode' }, { status: 400 })
  }
  const user = await requireUser()
  const { razorpayOrderId, outcome } = await readBody(req, mockPaySchema)

  const order = await db.order.findUnique({ where: { razorpayOrderId } })
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })
  if (order.userId !== user.id) return Response.json({ error: 'Order does not belong to you' }, { status: 403 })
  if (order.status !== 'PENDING') {
    return Response.json({ error: `Order is not payable (status: ${order.status})` }, { status: 400 })
  }

  if (outcome === 'failure') {
    await db.order.update({ where: { id: order.id }, data: { status: 'FAILED' } })
    return Response.json(
      { error: 'Payment failed at the gateway', orderId: order.id },
      { status: 402 }
    )
  }

  const { paymentId, signature } = simulateCheckoutSignature(razorpayOrderId)
  return Response.json({
    razorpayOrderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    // Simulate the small delay the real gateway hand-off has.
    gateway: 'razorpay-demo',
    nonce: randomBytes(4).toString('hex'),
  })
})
