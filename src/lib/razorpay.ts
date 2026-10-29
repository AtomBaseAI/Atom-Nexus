/**
 * Razorpay payment service.
 *
 * With RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET configured the service uses the
 * real Razorpay REST API. Without credentials it runs in **demo mode**:
 * orders/payments/refunds are simulated locally but follow the exact same
 * state machine and signature-verification flow as production, so the code
 * path is identical when real keys are added.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export const RAZORPAY_DEMO_MODE = !(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)

const RAZORPAY_API = 'https://api.razorpay.com/v1'

function authHeader(): string {
  const raw = `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  return `Basic ${Buffer.from(raw).toString('base64')}`
}

function demoSecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || 'rzp_demo_secret_key'
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string }

/** Create an order. Amount is in paise — always computed server-side. */
export async function createRazorpayOrder(amount: number, currency: string, receipt: string): Promise<RazorpayOrder> {
  if (RAZORPAY_DEMO_MODE) {
    return { id: `order_demo_${randomBytes(9).toString('hex')}`, amount, currency, status: 'created' }
  }
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency, receipt, payment_capture: 1 }),
  })
  if (!res.ok) throw new Error(`Razorpay order creation failed (${res.status})`)
  const data = (await res.json()) as RazorpayOrder
  return data
}

/**
 * Verify the checkout signature: HMAC-SHA256(`${order_id}|${payment_id}`, secret).
 * The browser callback alone is never trusted — this check is mandatory.
 */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = demoSecret()
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature || '', 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Demo-mode checkout simulator: plays the role Razorpay plays in production.
 * Computes the signature exactly like Razorpay would, so /api/payments/verify
 * runs the same verification logic in both modes.
 */
export function simulateCheckoutSignature(orderId: string): { paymentId: string; signature: string } {
  const paymentId = `pay_demo_${randomBytes(9).toString('hex')}`
  const signature = createHmac('sha256', demoSecret()).update(`${orderId}|${paymentId}`).digest('hex')
  return { paymentId, signature }
}

export type RazorpayRefund = { id: string; status: string; amount: number }

/** Initiate a refund through the provider. Never mark complete locally on request alone. */
export async function createRazorpayRefund(paymentId: string, amount?: number): Promise<RazorpayRefund> {
  if (RAZORPAY_DEMO_MODE) {
    // The simulated gateway accepts the refund; webhook/verify flow would confirm it.
    return { id: `rfnd_demo_${randomBytes(9).toString('hex')}`, status: 'processed', amount: amount ?? 0 }
  }
  const res = await fetch(`${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(amount ? { amount } : {}),
  })
  if (!res.ok) throw new Error(`Razorpay refund failed (${res.status})`)
  const data = (await res.json()) as { id: string; status: string; amount: number }
  return data
}

/** Verify a Razorpay webhook signature against the raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_demo_webhook_secret'
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature || '', 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}
