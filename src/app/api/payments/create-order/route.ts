import { db } from '@/lib/db'
import { handle, readBody, requireUser } from '@/lib/api-helpers'
import { createOrderSchema } from '@/lib/validation'
import { createRazorpayOrder, RAZORPAY_DEMO_MODE } from '@/lib/razorpay'
import { randomUUID } from 'crypto'

/**
 * Create a pending internal order + provider order.
 * The amount ALWAYS comes from the database — never from the client.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser()
  const { courseId } = await readBody(req, createOrderSchema)

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, priceAmount: true, currency: true, isFree: true, status: true },
  })
  if (!course || course.status !== 'PUBLISHED') {
    return Response.json({ error: 'Course is not available' }, { status: 404 })
  }
  if (course.isFree) {
    return Response.json({ error: 'This course is free — use the free enrollment flow' }, { status: 400 })
  }

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  })
  if (existing && existing.status !== 'REVOKED') {
    return Response.json({ error: 'You are already enrolled in this course' }, { status: 409 })
  }

  const amount = course.priceAmount
  if (!Number.isInteger(amount) || amount <= 0) {
    return Response.json({ error: 'Invalid course price' }, { status: 400 })
  }

  const receipt = `rcpt_${Date.now()}_${randomUUID().slice(0, 8)}`
  const rzpOrder = await createRazorpayOrder(amount, course.currency, receipt)

  const order = await db.order.create({
    data: {
      userId: user.id,
      courseId,
      totalAmount: amount,
      currency: course.currency,
      status: 'PENDING',
      razorpayOrderId: rzpOrder.id,
    },
  })

  return Response.json({
    order: {
      id: order.id,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.totalAmount,
      currency: order.currency,
      status: order.status,
    },
    course: { id: course.id, title: course.title },
    checkout: {
      mode: RAZORPAY_DEMO_MODE ? 'demo' : 'live',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null,
      prefill: { name: user.name, email: user.email },
    },
  })
})
