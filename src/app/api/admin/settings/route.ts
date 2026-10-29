import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { settingsUpdateSchema } from '@/lib/validation'
import { RAZORPAY_DEMO_MODE } from '@/lib/razorpay'
import { MUX_DEMO_MODE } from '@/lib/mux'

export const GET = handle(async () => {
  await requireAdmin()
  const rows = await db.setting.findMany()
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return Response.json({
    settings: {
      platformName: settings.platformName ?? '',
      defaultLocale: settings.defaultLocale ?? 'en',
      supportedLocales: settings.supportedLocales ?? 'en,ta,hi',
      refundPolicy: settings.refundPolicy ?? '',
      supportEmail: settings.supportEmail ?? '',
      termsUrl: settings.termsUrl ?? '',
      privacyUrl: settings.privacyUrl ?? '',
    },
    integrations: {
      payments: RAZORPAY_DEMO_MODE ? 'demo' : 'live',
      video: MUX_DEMO_MODE ? 'demo' : 'live',
      note: 'Provider secrets are managed via environment variables, never stored in the database.',
    },
  })
})

export const PATCH = handle(async (req: Request) => {
  await requireAdmin()
  const data = await readBody(req, settingsUpdateSchema)

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    await db.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }
  return Response.json({ ok: true })
})
