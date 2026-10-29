/** Money helpers — amounts are stored as integer minor units (paise). */

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

export function paiseToRupees(paise: number): number {
  return paise / 100
}

export function formatINR(paise: number, locale = 'en'): string {
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-IN' : locale, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
    }).format(paise / 100)
  } catch {
    return `₹${(paise / 100).toLocaleString('en-IN')}`
  }
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
