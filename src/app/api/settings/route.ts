import { db } from '@/lib/db'
import { handle } from '@/lib/api-helpers'
import { RAZORPAY_DEMO_MODE } from '@/lib/razorpay'
import { MUX_DEMO_MODE } from '@/lib/mux'

const PUBLIC_KEYS = ['platformName', 'defaultLocale', 'supportedLocales', 'refundPolicy', 'supportEmail', 'termsUrl', 'privacyUrl']

export const GET = handle(async () => {
  const rows = await db.setting.findMany({ where: { key: { in: PUBLIC_KEYS } } })
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return Response.json({
    settings: {
      platformName: settings.platformName ?? 'Atom Nexus',
      defaultLocale: settings.defaultLocale ?? 'en',
      supportedLocales: settings.supportedLocales ?? 'en,ta,hi',
      refundPolicy: settings.refundPolicy ?? '',
      supportEmail: settings.supportEmail ?? '',
      termsUrl: settings.termsUrl ?? '#',
      privacyUrl: settings.privacyUrl ?? '#',
    },
    integrations: { payments: RAZORPAY_DEMO_MODE ? 'demo' : 'live', video: MUX_DEMO_MODE ? 'demo' : 'live' },
  })
})
