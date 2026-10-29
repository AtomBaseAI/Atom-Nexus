import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { videoAssignSchema } from '@/lib/validation'
import { MUX_DEMO_MODE, createDirectUpload, simulateProcessing } from '@/lib/mux'

function serializeVideo(lesson: {
  videoSourceUrl: string
  muxAssetId: string
  muxPlaybackId: string
  processingStatus: string
  durationSeconds: number
  lastProcessingError: string
  audioTracks: { id: string; languageCode: string; displayName: string; isPrimary: boolean; status: string }[]
  subtitles: { id: string; languageCode: string; displayName: string; status: string }[]
}) {
  const hasVideo = lesson.processingStatus !== 'NO_VIDEO' || lesson.videoSourceUrl !== ''
  return hasVideo
    ? {
        processingStatus: lesson.processingStatus,
        videoSourceUrl: lesson.videoSourceUrl,
        muxAssetId: lesson.muxAssetId,
        muxPlaybackId: lesson.muxPlaybackId,
        durationSeconds: lesson.durationSeconds,
        lastProcessingError: lesson.lastProcessingError,
        audioTracks: lesson.audioTracks,
        subtitles: lesson.subtitles,
      }
    : null
}

const includeTracks = {
  audioTracks: { select: { id: true, languageCode: true, displayName: true, isPrimary: true, status: true } },
  subtitles: { select: { id: true, languageCode: true, displayName: true, status: true } },
}

/**
 * Best-effort CORS origin for Mux direct uploads.
 * Prefers the browser's Origin header (works in ephemeral preview environments
 * where the public URL is not known ahead of time), then the forwarding host,
 * then APP_URL from the environment.
 */
function requestOrigin(req: Request): string | undefined {
  const origin = req.headers.get('origin')
  if (origin && /^https?:\/\//.test(origin)) return origin
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (host && !host.startsWith('localhost')) return `${proto}://${host}`
  return process.env.APP_URL || undefined
}

/**
 * Assign a video to a lesson.
 *  - Demo mode: register by URL, set PROCESSING, flip to READY via simulated pipeline.
 *  - Mux mode: create a direct upload and return the upload URL for the browser.
 */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const data = await readBody(req, videoAssignSchema)

  const lesson = await db.lesson.findUnique({ where: { id }, select: { id: true, title: true } })
  if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 })

  if (MUX_DEMO_MODE) {
    const stamp = Date.now().toString(36)
    await db.lesson.update({
      where: { id },
      data: {
        videoSourceUrl: data.videoUrl,
        processingStatus: 'PROCESSING',
        processingStartedAt: new Date(),
        lastProcessingError: '',
        muxAssetId: `demo-asset-${stamp}`,
        muxUploadId: `demo-upload-${stamp}`,
        muxPlaybackId: `demo-playback-${stamp}`,
        ...(data.durationSeconds ? { durationSeconds: data.durationSeconds } : {}),
      },
    })
    simulateProcessing(id)

    const fresh = await db.lesson.findUnique({ where: { id }, include: includeTracks })
    return Response.json({ mode: 'demo', processingStatus: 'PROCESSING', video: fresh ? serializeVideo(fresh) : null })
  }

  // Real Mux: direct upload
  const upload = await createDirectUpload({ corsOrigin: requestOrigin(req) })
  await db.lesson.update({
    where: { id },
    data: {
      videoSourceUrl: '',
      processingStatus: 'UPLOADING',
      processingStartedAt: new Date(),
      lastProcessingError: '',
      muxUploadId: upload.id,
    },
  })
  const fresh = await db.lesson.findUnique({ where: { id }, include: includeTracks })
  return Response.json({
    mode: 'mux',
    uploadUrl: upload.url,
    uploadId: upload.id,
    video: fresh ? serializeVideo(fresh) : null,
  })
})

/** Poll video processing status (real mode uses the Mux API; demo self-heals). */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const lesson = await db.lesson.findUnique({ where: { id }, include: includeTracks })
  if (!lesson) return Response.json({ video: null })

  // Demo-mode self-heal: if stuck in PROCESSING for over 15s, finalize.
  if (
    MUX_DEMO_MODE &&
    lesson.processingStatus === 'PROCESSING' &&
    lesson.processingStartedAt &&
    Date.now() - lesson.processingStartedAt.getTime() > 15_000
  ) {
    await db.lesson.update({ where: { id }, data: { processingStatus: 'READY' } })
    const fresh = await db.lesson.findUnique({ where: { id }, include: includeTracks })
    return Response.json({ video: fresh ? serializeVideo(fresh) : null })
  }

  return Response.json({ video: serializeVideo(lesson) })
})

/** Remove the video from a lesson. */
export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  await db.lesson.update({
    where: { id },
    data: {
      videoSourceUrl: '',
      muxAssetId: '',
      muxUploadId: '',
      muxPlaybackId: '',
      processingStatus: 'NO_VIDEO',
      durationSeconds: 0,
      lastProcessingError: '',
    },
  })
  return Response.json({ ok: true, video: null })
})
