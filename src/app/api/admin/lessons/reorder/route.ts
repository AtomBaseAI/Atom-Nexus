import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const schema = z.object({
  type: z.enum(['sections', 'lessons']),
  ids: z.array(z.string()).min(1),
})

/** Bulk reorder: set `order` by index of the id array (scoped to a course/section). */
export const POST = handle(async (req: Request) => {
  await requireAdmin()
  const { type, ids } = await readBody(req, schema)

  await db.$transaction(
    ids.map((id, index) => {
      if (type === 'sections') {
        return db.section.update({ where: { id }, data: { order: index } })
      }
      return db.lesson.update({ where: { id }, data: { order: index } })
    })
  )

  return Response.json({ ok: true, updated: ids.length })
})
