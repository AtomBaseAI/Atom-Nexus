import { db } from '@/lib/db'
import { handle, requireUser } from '@/lib/api-helpers'

const DAY_MS = 24 * 60 * 60 * 1000

type ActivityDay = {
  date: string
  label: string
  lessonsCompleted: number
  minutes: number
}

/**
 * Learner activity for the last 14 days: lessons completed and
 * watch minutes per day, derived from LessonProgress rows.
 */
export const GET = handle(async () => {
  const user = await requireUser()

  const since = new Date(Date.now() - 13 * DAY_MS)
  since.setHours(0, 0, 0, 0)

  const progressRows = await db.lessonProgress.findMany({
    where: { userId: user.id, updatedAt: { gte: since } },
    select: { watchedSeconds: true, completedAt: true, updatedAt: true },
  })

  const days: ActivityDay[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * DAY_MS)
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      lessonsCompleted: 0,
      minutes: 0,
    })
  }

  const index = new Map(days.map((d) => [d.date, d]))
  for (const row of progressRows) {
    // Watched minutes bucketed by the day the progress row was last touched.
    const key = row.updatedAt.toISOString().slice(0, 10)
    const day = index.get(key)
    if (day) day.minutes += Math.round(row.watchedSeconds / 60)
    // Completions bucketed by the completion timestamp.
    if (row.completedAt) {
      const cKey = row.completedAt.toISOString().slice(0, 10)
      const cDay = index.get(cKey)
      if (cDay) cDay.lessonsCompleted += 1
    }
  }

  // Learning streak: consecutive days (ending today or yesterday) with a completion.
  let streak = 0
  const completedByDay = new Set(
    progressRows.filter((r) => r.completedAt).map((r) => r.completedAt!.toISOString().slice(0, 10)),
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const key = new Date(today.getTime() - i * DAY_MS).toISOString().slice(0, 10)
    if (completedByDay.has(key)) streak += 1
    else if (i > 0) break // allow "today not yet studied" without breaking the streak
    else continue
  }

  const weekMinutes = days.slice(-7).reduce((s, d) => s + d.minutes, 0)
  const prevWeekMinutes = days.slice(0, 7).reduce((s, d) => s + d.minutes, 0)

  return Response.json({
    days,
    streak,
    weekMinutes,
    prevWeekMinutes,
  })
})
