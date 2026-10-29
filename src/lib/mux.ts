/**
 * Mux Video service.
 *
 * When MUX_TOKEN_ID / MUX_TOKEN_SECRET are configured the service talks to the
 * real Mux API (direct uploads, asset status, signed playback). Without
 * credentials it runs in **demo mode**: videos are registered by URL and a
 * simulated processing pipeline marks assets READY after a few seconds, so the
 * full admin → publish → learner flow can be exercised end to end.
 */
import { createSign, createVerify, randomBytes } from 'crypto'

export const MUX_DEMO_MODE = !(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET)

const MUX_API = 'https://api.mux.com'

function authHeader(): string {
  const raw = `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`
  return `Basic ${Buffer.from(raw).toString('base64')}`
}

export type MuxUpload = { id: string; url: string }

/** Create a direct-upload. Real mode → Mux direct upload; demo → pseudo object. */
export async function createDirectUpload(opts: {
  corsOrigin?: string
  newAssetSettings?: { playbackPolicy?: string[] }
}): Promise<MuxUpload> {
  if (MUX_DEMO_MODE) {
    return { id: `demo-upload-${randomBytes(8).toString('hex')}`, url: '' }
  }
  const res = await fetch(`${MUX_API}/video/v1/uploads`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cors_origin: opts.corsOrigin,
      new_asset_settings: {
        playback_policy: opts.newAssetSettings?.playbackPolicy ?? ['signed'],
        ...(opts.newAssetSettings ?? {}),
      },
    }),
  })
  if (!res.ok) throw new Error(`Mux upload creation failed (${res.status})`)
  const data = (await res.json()) as { data: { id: string; url: string } }
  return { id: data.data.id, url: data.data.url }
}

export type MuxAssetStatus = { status: 'PREPARING' | 'READY' | 'ERRORED'; playbackId?: string; duration?: number }

/** Fetch asset status. Real mode only; demo mode never calls this. */
export async function getAssetStatus(assetId: string): Promise<MuxAssetStatus> {
  const res = await fetch(`${MUX_API}/video/v1/assets/${encodeURIComponent(assetId)}`, {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) throw new Error(`Mux asset fetch failed (${res.status})`)
  const data = (await res.json()) as {
    data: { status: string; playback_ids?: { id: string }[]; duration?: number }
  }
  return {
    status: data.data.status as MuxAssetStatus['status'],
    playbackId: data.data.playback_ids?.[0]?.id,
    duration: data.data.duration,
  }
}

/** Add an alternate audio track to a ready asset (real mode). */
export async function addAudioTrack(assetId: string, url: string, languageCode: string, name: string) {
  const res = await fetch(`${MUX_API}/video/v1/assets/${encodeURIComponent(assetId)}/tracks`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'audio', text_type: undefined, url, language_code: languageCode, name, closed_captions: false }),
  })
  if (!res.ok) throw new Error(`Mux audio track creation failed (${res.status})`)
  const data = (await res.json()) as { data: { id: string } }
  return data.data.id
}

/** Add a subtitle (text track) to a ready asset (real mode). */
export async function addSubtitleTrack(assetId: string, url: string, languageCode: string, name: string) {
  const res = await fetch(`${MUX_API}/video/v1/assets/${encodeURIComponent(assetId)}/tracks`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'text', text_type: 'subtitles', url, language_code: languageCode, name, closed_captions: false }),
  })
  if (!res.ok) throw new Error(`Mux subtitle track creation failed (${res.status})`)
  const data = (await res.json()) as { data: { id: string } }
  return data.data.id
}

/* ------------------------------------------------------------------ */
/* Signed playback (RS256 JWT, implemented with node:crypto so that    */
/* no extra dependency is required). Keys stay server-side.            */
/* ------------------------------------------------------------------ */

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

function signRsa256(data: string, privateKeyPem: string): string {
  const signer = createSign('RSA-SHA256')
  signer.update(data)
  return base64url(signer.sign(privateKeyPem))
}

/**
 * Generate a signed playback JWT for Mux signed URLs.
 * Returns null when signing keys are not configured (demo mode uses public URLs).
 */
export function createPlaybackToken(playbackId: string, expirationSeconds = 60 * 60 * 4): string | null {
  const keyId = process.env.MUX_SIGNING_KEY_ID
  const privateKey = process.env.MUX_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!keyId || !privateKey) return null
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64url(
    JSON.stringify({
      sub: playbackId,
      aud: 'v',
      exp: now + expirationSeconds,
      iat: now,
      kid: keyId,
    })
  )
  const signingInput = `${header}.${payload}`
  return `${signingInput}.${signRsa256(signingInput, privateKey)}`
}

/* ------------------------------------------------------------------ */
/* Demo-mode simulated processing                                      */
/* ------------------------------------------------------------------ */

const g = globalThis as unknown as { __lmsDemoTimers?: Set<NodeJS.Timeout> }
g.__lmsDemoTimers ??= new Set()

/**
 * Demo mode: simulate Mux processing. The lesson flips to READY after `delayMs`.
 * The in-memory timer is best-effort; GET /api/admin/media also self-heals any
 * lesson stuck in PROCESSING for more than 15s.
 */
export function simulateProcessing(lessonId: string, delayMs = 6000) {
  const t = setTimeout(async () => {
    g.__lmsDemoTimers!.delete(t)
    try {
      const { db } = await import('@/lib/db')
      const lesson = await db.lesson.findUnique({ where: { id: lessonId } })
      if (lesson && lesson.processingStatus === 'PROCESSING') {
        await db.lesson.update({
          where: { id: lessonId },
          data: { processingStatus: 'READY', lastProcessingError: '' },
        })
      }
    } catch (err) {
      console.error('[mux-demo] finalize failed', err)
    }
  }, delayMs)
  g.__lmsDemoTimers!.add(t)
}

export const DEMO_SAMPLE_VIDEOS = [
  { label: 'Big Buck Bunny (596s)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', duration: 596 },
  { label: 'Elephants Dream (653s)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', duration: 653 },
  { label: 'Sintel (888s)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', duration: 888 },
  { label: 'Tears of Steel (734s)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', duration: 734 },
  { label: 'For Bigger Fun (60s)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', duration: 60 },
  { label: 'For Bigger Blazes (15s)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', duration: 15 },
  { label: 'For Bigger Escapes (15s)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', duration: 15 },
  { label: 'For Bigger Joyrides (15s)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', duration: 15 },
  { label: 'For Bigger Meltdowns (15s)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', duration: 15 },
]
