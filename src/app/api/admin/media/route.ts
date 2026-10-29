import { db } from '@/lib/db'
import { handle, requireAdmin } from '@/lib/api-helpers'
import { MUX_DEMO_MODE } from '@/lib/mux'

/** Media library — every lesson video with processing metadata. Self-heals stuck demo processing. */
export const GET = handle(async () => {
  await requireAdmin()

  if (MUX_DEMO_MODE) {
    // Demo-mode self-heal: anything stuck in PROCESSING >15s flips to READY.
    const stuck = await db.lesson.findMany({
      where: { processingStatus: 'PROCESSING', processingStartedAt: { lt: new Date(Date.now() - 15_000) } },
      select: { id: true },
    })
    if (stuck.length > 0) {
      await db.lesson.updateMany({
        where: { id: { in: stuck.map((l) => l.id) } },
        data: { processingStatus: 'READY', lastProcessingError: '' },
      })
    }
  }

  const lessons = await db.lesson.findMany({
    where: { OR: [{ processingStatus: { not: 'NO_VIDEO' } }, { videoSourceUrl: { not: '' } }] },
    orderBy: { updatedAt: 'desc' },
    include: {
      course: { select: { id: true, title: true, slug: true, status: true } },
      section: { select: { title: true } },
      audioTracks: { select: { languageCode: true, displayName: true, status: true } },
      subtitles: { select: { languageCode: true, displayName: true, status: true } },
    },
  })

  return Response.json({
    mode: MUX_DEMO_MODE ? 'demo' : 'mux',
    videos: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      course: l.course,
      sectionTitle: l.section.title,
      processingStatus: l.processingStatus,
      durationSeconds: l.durationSeconds,
      videoSourceUrl: l.videoSourceUrl,
      muxAssetId: l.muxAssetId,
      muxPlaybackId: l.muxPlaybackId,
      lastProcessingError: l.lastProcessingError,
      updatedAt: l.updatedAt.toISOString(),
      audioTracks: l.audioTracks,
      subtitles: l.subtitles,
    })),
  })
})
