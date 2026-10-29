import { db } from '@/lib/db'
import { handle, readBody, requireAdmin } from '@/lib/api-helpers'
import { subtitleSchema } from '@/lib/validation'
import { MUX_DEMO_MODE, addSubtitleTrack } from '@/lib/mux'

/** Add a subtitle track to a lesson's video. */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin()
  const { id } = await params
  const data = await readBody(req, subtitleSchema)

  const lesson = await db.lesson.findUnique({ where: { id }, select: { id: true, processingStatus: true, muxAssetId: true } })
  if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 })

  const dup = await db.lessonSubtitle.findUnique({
    where: { lessonId_languageCode: { lessonId: id, languageCode: data.languageCode } },
  }).catch(() => null)
  if (dup) return Response.json({ error: 'This subtitle language already exists' }, { status: 409 })

  let muxTrackId = ''
  let status = 'READY'
  const srcUrl = data.srcUrl ?? `/subtitles/${data.languageCode}.vtt`

  if (!MUX_DEMO_MODE && lesson.processingStatus === 'READY' && lesson.muxAssetId) {
    try {
      muxTrackId = await addSubtitleTrack(lesson.muxAssetId, srcUrl, data.languageCode, data.displayName)
      status = 'PROCESSING'
    } catch (err) {
      console.error('[admin] mux subtitle failed:', err)
      return Response.json({ error: 'Mux track creation failed' }, { status: 502 })
    }
  }

  const subtitle = await db.lessonSubtitle.create({
    data: {
      lessonId: id,
      languageCode: data.languageCode,
      displayName: data.displayName,
      status,
      srcUrl,
      muxTrackId,
    },
  })

  return Response.json(
    { subtitle: { id: subtitle.id, languageCode: subtitle.languageCode, displayName: subtitle.displayName, status: subtitle.status } },
    { status: 201 }
  )
})
