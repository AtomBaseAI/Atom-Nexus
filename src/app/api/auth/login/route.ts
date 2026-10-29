import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'
import { handle, readBody } from '@/lib/api-helpers'
import { checkRate, clientKey } from '@/lib/ratelimit'
import { loginSchema } from '@/lib/validation'

export const POST = handle(async (req: Request) => {
  if (!checkRate(clientKey(req, 'login'), 15, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 })
  }
  const { email, password } = await readBody(req, loginSchema)

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }
  if (user.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'This account has been disabled. Contact support.' }, { status: 403 })
  }

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, preferredLocale: user.preferredLocale },
  })
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions)
  return res
})
