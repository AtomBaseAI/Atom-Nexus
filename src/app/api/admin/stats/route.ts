import { db } from '@/lib/db'
import { handle, requireAdmin } from '@/lib/api-helpers'
import { formatINR } from '@/lib/money'

export const GET = handle(async () => {
  await requireAdmin()

  const [totalLearners, publishedCourses, totalCourses, totalLessons, totalEnrollments, paidAgg, refundAgg] =
    await Promise.all([
      db.user.count({ where: { role: 'LEARNER' } }),
      db.course.count({ where: { status: 'PUBLISHED' } }),
      db.course.count(),
      db.lesson.count(),
      db.enrollment.count({ where: { status: { not: 'REVOKED' } } }),
      db.payment.aggregate({ where: { status: 'CAPTURED' }, _sum: { amount: true }, _count: true }),
      db.refund.aggregate({ where: { status: 'PROCESSED' }, _sum: { amount: true } }),
    ])

  const recentPurchases = await db.order.findMany({
    where: { status: { in: ['PAID', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED'] } },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true, slug: true } },
    },
  })

  const recentLearners = await db.user.findMany({
    where: { role: 'LEARNER' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, createdAt: true },
  })

  const problemLessons = await db.lesson.findMany({
    where: { processingStatus: { in: ['FAILED', 'NO_VIDEO', 'PROCESSING'] }, course: { status: 'PUBLISHED' } },
    take: 8,
    include: { course: { select: { title: true, slug: true } } },
  })

  const popularCourses = await db.course.findMany({
    orderBy: { enrollments: { _count: 'desc' } },
    take: 5,
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnailUrl: true,
      status: true,
      priceAmount: true,
      _count: { select: { enrollments: { where: { status: { not: 'REVOKED' } } } } },
    },
  })

  return Response.json({
    stats: {
      // Contract keys (frontend) + legacy aliases for safety
      learners: totalLearners,
      totalLearners,
      publishedCourses,
      totalCourses,
      lessons: totalLessons,
      totalLessons,
      enrollments: totalEnrollments,
      totalEnrollments,
      grossRevenue: paidAgg._sum.amount ?? 0,
      grossRevenueLabel: formatINR(paidAgg._sum.amount ?? 0),
      successfulPayments: paidAgg._count,
      refundTotal: refundAgg._sum.amount ?? 0,
      refundTotalLabel: formatINR(refundAgg._sum.amount ?? 0),
    },
    recentPurchases: recentPurchases.map((o) => ({
      id: o.id,
      status: o.status,
      amount: o.totalAmount,
      createdAt: o.createdAt.toISOString(),
      courseTitle: o.course.title,
      learnerName: o.user.name,
      learnerEmail: o.user.email,
      learner: o.user,
      course: o.course,
    })),
    recentLearners: recentLearners.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    processingProblems: problemLessons.map((l) => ({
      id: l.id,
      lessonTitle: l.title,
      courseTitle: l.course.title,
      processingStatus: l.processingStatus,
      hint:
        l.processingStatus === 'FAILED'
          ? l.lastProcessingError || 'Processing failed at the provider. Re-assign the video.'
          : l.processingStatus === 'NO_VIDEO'
            ? 'This lesson has no video assigned yet.'
            : 'Processing is taking longer than usual. Check the media library.',
    })),
    popularCourses: popularCourses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      thumbnailUrl: c.thumbnailUrl,
      status: c.status,
      priceAmount: c.priceAmount,
      learners: c._count.enrollments,
    })),
  })
})
