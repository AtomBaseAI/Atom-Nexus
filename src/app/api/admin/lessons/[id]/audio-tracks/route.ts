import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { audioTrackSchema } from '@/lib/validation'
import { MUX_DEMO_MODE, addAudioTrack, DEMO_SAMPLE_VIDEOS } from '@/lib/mux'

/**
 * Add an alternate audio (dub) track to a lesson's video.
 * Language codes must match the actual audio content — the demo simulates this.
 */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const data = await readBody(req, audioTrackSchema)

  const lesson = await db.lesson.findUnique({ where: { id }, select: { id: true, processingStatus: true, muxAssetId: true } })
  if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 })
  if (lesson.processingStatus === 'NO_VIDEO') {
    return Response.json({ error: 'Assign a video before adding audio tracks' }, { status: 400 })
  }

  const existing = await db.lessonAudioTrack.findUnique({
    where: { lessonId_languageCode: { lessonId: id, languageCode: data.languageCode } },
  }).catch(() => null)
  if (existing) return Response.json({ error: 'This audio language already exists' }, { status: 409 })

  let muxTrackId = ''
  let status = 'READY'
  let srcUrl = ''

  if (MUX_DEMO_MODE) {
    // Demo: a dubbed track is simulated with a distinct source stream.
    srcUrl = DEMO_SAMPLE_VIDEOS[Math.floor(Math.random() * DEMO_SAMPLE_VIDEOS.length)].url
  } else {
    if (lesson.processingStatus !== 'READY') {
      return Response.json({ error: 'Video must be READY before adding tracks' }, { status: 400 })
    }
    try {
      muxTrackId = await addAudioTrack(lesson.muxAssetId, data.srcUrlForUpload ?? '', data.languageCode, data.displayName)
      status = 'PROCESSING'
    } catch (err) {
      console.error('[admin] mux audio track failed:', err)
      return Response.json({ error: 'Mux track creation failed' }, { status: 502 })
    }
  }

  const track = await db.lessonAudioTrack.create({
    data: {
      lessonId: id,
      languageCode: data.languageCode,
      displayName: data.displayName,
      isPrimary: false,
      status,
      srcUrl,
      muxTrackId,
    },
  })

  return Response.json(
    { track: { id: track.id, languageCode: track.languageCode, displayName: track.displayName, status: track.status } },
    { status: 201 }
  )
})
