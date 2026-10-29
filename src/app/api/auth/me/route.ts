import { db } from '@/lib/db'
import { handle, readBody, requireUser } from '@/lib/api-helpers'
import { profileUpdateSchema } from '@/lib/validation'

export const GET = handle(async () => {
  const session = await requireUser()
  const user = await db.user.findUnique({ where: { id: session.id } })
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, preferredLocale: user.preferredLocale },
  })
})

export const PATCH = handle(async (req: Request) => {
  const session = await requireUser()
  const data = await readBody(req, profileUpdateSchema)
  const user = await db.user.update({ where: { id: session.id }, data })
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, preferredLocale: user.preferredLocale },
  })
})
