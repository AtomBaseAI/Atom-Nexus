import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export const SESSION_COOKIE = 'lms_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

function secret(): string {
  return process.env.AUTH_SECRET || 'dev-only-secret-change-me'
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

export type SessionPayload = { uid: string; exp: number }

export function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const body = b64url(JSON.stringify(payload))
  const sig = createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = createHmac('sha256', secret()).update(body).digest()
    const actual = Buffer.from(sig, 'base64url')
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (!payload.uid || payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
}

export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
  preferredLocale: string
  status: string
}

/** Read the session from the request cookies and load the user. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = verifySessionToken(token)
  if (!payload) return null
  const user = await db.user.findUnique({ where: { id: payload.uid } })
  if (!user || user.status !== 'ACTIVE') return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    preferredLocale: user.preferredLocale,
    status: user.status,
  }
}
