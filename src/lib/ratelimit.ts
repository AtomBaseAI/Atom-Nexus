/**
 * Minimal in-memory fixed-window rate limiter.
 * Suitable for a single-instance deployment; swap for a shared store in production.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function checkRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

/** Best-effort client identity for rate limiting. */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local'
  return `${scope}:${fwd.split(',')[0].trim()}`
}

// Periodically clean expired buckets so the map does not grow forever.
const g = globalThis as unknown as { __lmsRateCleanup?: boolean }
if (!g.__lmsRateCleanup) {
  g.__lmsRateCleanup = true
  setInterval(
    () => {
      const now = Date.now()
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k)
    },
    5 * 60 * 1000
  )
}
