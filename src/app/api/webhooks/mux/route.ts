import { createHmac, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { handle } from '@/lib/api-helpers'

type MuxWebhook = {
  type?: string
  object?: { id?: string }
  data?: { id?: string; status?: string; playback_ids?: { id: string; policy: string }[]; duration?: number }
}

/**
 * Mux webhook receiver.
 * - Verifies the Mux webhook signature (`mux-signature: t=<ts>,v1=<hmac>`) over `${ts}.${rawBody}`.
 *   In demo mode (no MUX_WEBHOOK_SECRET) events are accepted unverified — real mode must set the secret.
 * - Deduplicates events via WebhookEvent.providerEventId.
 * - Maps upload.asset.created / asset.ready / asset.errored onto lessons.
 */
export const POST = handle(async (req: Request) => {
  const raw = await req.text()
  const secret = process.env.MUX_WEBHOOK_SECRET

  if (secret) {
    const sigHeader = req.headers.get('mux-signature') ?? ''
    const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=') as [string, string]))
    const timestamp = parts['t']
    const v1 = parts['v1']
    if (!timestamp || !v1) return Response.json({ error: 'Invalid signature header' }, { status: 401 })
    const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex')
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(v1, 'utf8')
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return Response.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }
  }

  let event: MuxWebhook
  try {
    event = JSON.parse(raw) as MuxWebhook
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventId = req.headers.get('mux-event-id') ?? event.data?.id ?? `${event.type}_${event.object?.id}`
  const dupe = await db.webhookEvent.findUnique({ where: { providerEventId: eventId } })
  if (dupe) return Response.json({ ok: true, deduplicated: true })

  await db.webhookEvent.create({
    data: { provider: 'mux', providerEventId: eventId, eventType: event.type ?? 'unknown', payload: raw.slice(0, 8000) },
  })

  const assetId = event.object?.id
  const findLesson = async () => {
    if (!assetId) return null
    return db.lesson.findFirst({
      where: { OR: [{ muxAssetId: assetId }, { muxUploadId: assetId }] },
    })
  }

  const lesson = await findLesson()
  if (!lesson) return Response.json({ ok: true, ignored: true })

  switch (event.type) {
    case 'video.upload.asset_created':
      await db.lesson.update({
        where: { id: lesson.id },
        data: {
          processingStatus: 'PROCESSING',
          processingStartedAt: new Date(),
          muxAssetId: event.data?.id ?? lesson.muxAssetId,
          muxUploadId: assetId ?? lesson.muxUploadId,
        },
      })
      break
    case 'video.asset.ready': {
      const playbackId = event.data?.playback_ids?.[0]?.id ?? lesson.muxPlaybackId
      await db.lesson.update({
        where: { id: lesson.id },
        data: {
          processingStatus: 'READY',
          lastProcessingError: '',
          muxPlaybackId: playbackId,
          durationSeconds: event.data?.duration ? Math.round(event.data.duration) : lesson.durationSeconds,
        },
      })
      // Mark related tracks ready (separate updateMany calls keep types simple).
      await db.lessonAudioTrack.updateMany({ where: { lessonId: lesson.id }, data: { status: 'READY' } })
      await db.lessonSubtitle.updateMany({ where: { lessonId: lesson.id }, data: { status: 'READY' } })
      break
    }
    case 'video.asset.errored':
      await db.lesson.update({
        where: { id: lesson.id },
        data: { processingStatus: 'FAILED', lastProcessingError: 'Asset processing errored at Mux' },
      })
      break
    default:
      break
  }

  return Response.json({ ok: true })
})
