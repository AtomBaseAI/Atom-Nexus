import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'
import { handle, readBody } from '@/lib/api-helpers'
import { checkRate, clientKey } from '@/lib/ratelimit'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(128),
})

// The server always assigns the LEARNER role — never trust role input.
export const POST = handle(async (req: Request) => {
  if (!checkRate(clientKey(req, 'register'), 10, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 })
  }
  const { name, email, password } = await readBody(req, schema)

  const normalizedEmail = email.toLowerCase().trim()
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const user = await db.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: 'LEARNER',
    },
  })

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, preferredLocale: user.preferredLocale },
  })
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions)
  return res
})
