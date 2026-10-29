import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { handle } from '@/lib/api-helpers'
import { MUX_DEMO_MODE, createPlaybackToken } from '@/lib/mux'

/**
 * Playback authorization endpoint.
 * Verifies access server-side BEFORE returning any playback data:
 *  - preview lessons of published courses → public
 *  - otherwise requires an authenticated learner with an active enrollment
 * Demo mode returns per-language source URLs; Mux mode returns a signed
 * playback token (keys never leave the server).
 */
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const lesson = await db.lesson.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      isPreview: true,
      durationSeconds: true,
      processingStatus: true,
      videoSourceUrl: true,
      muxPlaybackId: true,
      section: {
        select: { order: true, title: true, course: { select: { id: true, title: true, slug: true, status: true } } },
      },
      audioTracks: { select: { id: true, languageCode: true, displayName: true, isPrimary: true, status: true, srcUrl: true } },
      subtitles: { select: { id: true, languageCode: true, displayName: true, status: true, srcUrl: true } },
    },
  })
  if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 })

  const course = lesson.section.course
  if (course.status !== 'PUBLISHED') {
    return Response.json({ error: 'Course is not available' }, { status: 403 })
  }

  const user = await getSessionUser()
  let access: 'public-preview' | 'enrolled' | 'admin' = 'public-preview'
  let enrollmentStatus: string | null = null

  if (user) {
    if (user.role === 'ADMIN') {
      access = 'admin'
    } else {
      const enrollment = await db.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      })
      if (enrollment && enrollment.status !== 'REVOKED') {
        access = 'enrolled'
        enrollmentStatus = enrollment.status
      }
    }
  }

  const isReady = lesson.processingStatus === 'READY'
  if (!isReady) {
    return Response.json({ error: 'Video is not available yet', processingStatus: lesson.processingStatus }, { status: 423 })
  }

  if (access === 'public-preview' && !lesson.isPreview) {
    return Response.json({ error: 'Enroll to access this lesson', needsEnrollment: true }, { status: 403 })
  }

  // Previous position for resume
  let positionSeconds = 0
  let completed = false
  if (user) {
    const progress = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: id } },
    })
    if (progress) {
      positionSeconds = progress.lastPositionSeconds
      completed = Boolean(progress.completedAt)
    }
  }

  // Demo mode: alternate audio = distinct source URLs. Real Mux: one asset with
  // multiple audio tracks + signed playback token.
  let playback: Record<string, unknown>
  if (MUX_DEMO_MODE) {
    const sources = lesson.audioTracks
      .filter((t) => t.status === 'READY' && t.srcUrl)
      .map((t) => ({
        languageCode: t.languageCode,
        displayName: t.displayName,
        isPrimary: t.isPrimary,
        url: t.srcUrl || lesson.videoSourceUrl,
      }))
    if (sources.length === 0 && lesson.videoSourceUrl) {
      sources.push({ languageCode: 'en', displayName: 'English', isPrimary: true, url: lesson.videoSourceUrl })
    }
    playback = { mode: 'demo', sources }
  } else {
    const token = createPlaybackToken(lesson.muxPlaybackId)
    playback = {
      mode: 'mux',
      playbackId: lesson.muxPlaybackId,
      playbackToken: token,
      audioTracks: lesson.audioTracks.map((t) => ({
        languageCode: t.languageCode,
        displayName: t.displayName,
        isPrimary: t.isPrimary,
      })),
    }
  }

  return Response.json({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      isPreview: lesson.isPreview,
      durationSeconds: lesson.durationSeconds,
      sectionTitle: lesson.section.title,
      sectionOrder: lesson.section.order,
    },
    course: { id: course.id, title: course.title, slug: course.slug },
    access,
    enrollmentStatus,
    playback,
    subtitles: lesson.subtitles
      .filter((s) => s.status === 'READY' && s.srcUrl)
      .map((s) => ({ languageCode: s.languageCode, displayName: s.displayName, url: s.srcUrl })),
    positionSeconds,
    completed,
  })
})
