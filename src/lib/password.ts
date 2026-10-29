import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

/**
 * Password hashing with Node's built-in scrypt.
 * Stored format: scrypt:<saltHex>:<hashHex>
 * (Kept dependency-free so it can be used in seed scripts and route handlers.)
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, saltHex, hashHex] = stored.split(':')
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(password, salt, 64)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}
