import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getSessionUser, type SessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Wraps a route handler with consistent error handling:
 * ApiError → status + message, ZodError → 422, unknown → 500.
 */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args)
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      if (err instanceof ZodError) {
        const first = err.issues[0]
        return NextResponse.json(
          { error: first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input' },
          { status: 422 }
        )
      }
      console.error('[api] unexpected error:', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new ApiError(401, 'Authentication required')
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'ADMIN') throw new ApiError(403, 'Admin access required')
  return user
}

/** Parse and validate a JSON body with a Zod schema. */
export async function readBody<T>(req: Request, schema: { parse: (v: unknown) => T }): Promise<T> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new ApiError(400, 'Invalid JSON body')
  }
  return schema.parse(raw)
}

/** Check that a user has an active enrollment in a course. */
export async function requireEnrollment(userId: string, courseId: string) {
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (!enrollment || enrollment.status === 'REVOKED') {
    throw new ApiError(403, 'You do not have access to this course')
  }
  return enrollment
}
