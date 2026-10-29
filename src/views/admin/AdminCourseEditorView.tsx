'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { formatINR, paiseToRupees, rupeesToPaise } from '@/lib/money'
import { useNavStore } from '@/stores/nav-store'
import { AdminShell } from './AdminShell'
import { GlassCard } from '@/components/shared/GlassCard'
import { PaymentStatusBadge } from '@/components/shared/PaymentStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Languages,
  Plus,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react'

/* ------------------------------- types ------------------------------- */

type Category = { id: string; name: string; slug: string }

type AudioTrack = { id: string; languageCode: string; displayName: string; status: string }
type Subtitle = { id: string; languageCode: string; displayName: string; status: string }

type Lesson = {
  id: string
  title: string
  description: string | null
  isPreview: boolean
  durationSeconds: number | null
  videoSourceUrl: string | null
  processingStatus: string
  position: number
  audioTracks?: AudioTrack[]
  subtitles?: Subtitle[]
}

type Section = { id: string; title: string; position: number; lessons: Lesson[] }

type CourseDetail = {
  id: string
  title: string
  slug: string
  shortDescription: string
  description: string | null
  thumbnailUrl: string | null
  level: string
  featured: boolean
  isFree: boolean
  priceAmount: number
  compareAtPrice: number | null
  status: string
  categoryId: string | null
  category?: { id: string; name: string; slug: string } | null
  objectives: string[]
  prerequisites: string[]
  targetAudience: string[]
  sections: Section[]
}

type LessonVideo = {
  processingStatus: string
  videoSourceUrl: string | null
  durationSeconds: number | null
  audioTracks?: AudioTrack[]
  subtitles?: Subtitle[]
}

/* ----------------------------- constants ----------------------------- */

const THUMBNAIL_CHIPS = [
  '/images/course-webdev.png',
  '/images/course-typescript.png',
  '/images/course-cloud.png',
  '/images/course-data.png',
  '/images/course-design.png',
  '/images/course-business.png',
  '/images/course-nextjs.png',
  '/images/course-uiux.png',
  '/images/hero.png',
]

const SAMPLE_VIDEOS = [
  { label: 'Big Buck Bunny', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
  { label: 'Elephants Dream', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
  { label: 'Sintel', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
  { label: 'Tears of Steel', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
  { label: 'For Bigger Fun', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
  { label: 'For Bigger Blazes', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
  { label: 'For Bigger Escapes', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
  { label: 'For Bigger Joyrides', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
  { label: 'For Bigger Meltdowns', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4' },
]

const LANG_NAMES: Record<string, string> = { en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu' }

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All levels' },
]

const splitLines = (t: string) => t.split('\n').map((s) => s.trim()).filter(Boolean)
const linesOf = (v: string[] | string | null | undefined) => (Array.isArray(v) ? v.join('\n') : (v ?? ''))

const statusDot = (s: string) =>
  s === 'READY' || s === 'PROCESSED'
    ? 'bg-emerald-500'
    : s === 'PROCESSING' || s === 'UPLOADING'
      ? 'bg-amber-500'
      : s === 'FAILED'
        ? 'bg-rose-500'
        : 'bg-zinc-400'

/* ------------------------------ component ---------------------------- */

export function AdminCourseEditorView({ courseId }: { courseId?: string }) {
  const navigate = useNavStore((s) => s.navigate)

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(!!courseId)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create-new was removed — course creation starts from the Courses page.
  const [categories, setCategories] = useState<Category[]>([])

  // Tab 1 — basic info
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [level, setLevel] = useState('BEGINNER')
  const [featured, setFeatured] = useState(false)
  const [objectivesText, setObjectivesText] = useState('')
  const [prerequisitesText, setPrerequisitesText] = useState('')
  const [targetAudienceText, setTargetAudienceText] = useState('')

  // Tab 2 — curriculum (local)
  const [sections, setSections] = useState<Section[]>([])
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [editSection, setEditSection] = useState<{ id: string; title: string } | null>(null)
  const [lessonDialog, setLessonDialog] = useState<{
    open: boolean
    sectionId: string
    lesson: Lesson | null
  }>({ open: false, sectionId: '', lesson: null })
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [lessonPreview, setLessonPreview] = useState(false)
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<Section | null>(null)
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<{ sectionId: string; lesson: Lesson } | null>(null)

  // Tab 3 — video & audio
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [videoInfo, setVideoInfo] = useState<LessonVideo | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoDuration, setVideoDuration] = useState('')
  const [assigningVideo, setAssigningVideo] = useState(false)
  const [audioOpen, setAudioOpen] = useState(false)
  const [audioLang, setAudioLang] = useState('')
  const [subOpen, setSubOpen] = useState(false)
  const [subLang, setSubLang] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Tab 4 — pricing
  const [isFree, setIsFree] = useState(false)
  const [priceRupees, setPriceRupees] = useState('')
  const [compareRupees, setCompareRupees] = useState('')

  // Tab 5 — publishing
  const [publishing, setPublishing] = useState(false)
  const [publishProblems, setPublishProblems] = useState<string[] | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const startPolling = useCallback(
    (lessonId: string) => {
      stopPolling()
      pollRef.current = setInterval(async () => {
        try {
          const r = await api.get<{ video: LessonVideo | null }>(`/api/admin/lessons/${lessonId}/video`)
          setVideoInfo(r.video)
          const status = r.video?.processingStatus
          if (status !== 'PROCESSING') {
            stopPolling()
            if (status === 'READY') toast.success('Video processed and ready')
            else if (status === 'FAILED') toast.error('Video processing failed')
          }
        } catch {
          stopPolling()
        }
      }, 3000)
    },
    [stopPolling],
  )

  /* ---------------------------- data loading --------------------------- */

  useEffect(() => {
    api
      .get<{ categories: Category[] }>('/api/categories')
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]))
  }, [])

  // The standalone Create Course page was removed — creation now starts
  // from the Courses page. If the editor is opened without a course id
  // (e.g. a stale restored view), send the admin to the Courses list.
  useEffect(() => {
    if (!courseId) navigate({ name: 'admin-courses' }, { replace: true })
  }, [courseId, navigate])

  const refreshCourse = useCallback(async () => {
    if (!courseId) return
    try {
      const r = await api.get<{ course: CourseDetail }>(`/api/admin/courses/${courseId}`)
      setCourse(r.course)
      setSections(Array.isArray(r.course.sections) ? r.course.sections : [])
    } catch (err) {
      toast.error((err as Error).message)
    }
  }, [courseId])

  useEffect(() => {
    if (!courseId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)
    api
      .get<{ course: CourseDetail }>(`/api/admin/courses/${courseId}`)
      .then((r) => {
        if (cancelled) return
        const c = r.course
        setCourse(c)
        setSections(Array.isArray(c.sections) ? c.sections : [])
        setTitle(c.title ?? '')
        setSlug(c.slug ?? '')
        setShortDescription(c.shortDescription ?? '')
        setDescription(c.description ?? '')
        setThumbnailUrl(c.thumbnailUrl ?? '')
        setCategoryId(c.categoryId ?? '')
        setLevel(c.level ?? 'BEGINNER')
        setFeatured(!!c.featured)
        setObjectivesText(linesOf(c.objectives))
        setPrerequisitesText(linesOf(c.prerequisites))
        setTargetAudienceText(linesOf(c.targetAudience))
        setIsFree(!!c.isFree)
        setPriceRupees(String(paiseToRupees(c.priceAmount ?? 0)))
        setCompareRupees(c.compareAtPrice ? String(paiseToRupees(c.compareAtPrice)) : '')
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [courseId])

  // Fetch video info whenever the picked lesson changes
  useEffect(() => {
    stopPolling()
    if (!selectedLessonId) {
      setVideoInfo(null)
      return
    }
    let cancelled = false
    api
      .get<{ video: LessonVideo | null }>(`/api/admin/lessons/${selectedLessonId}/video`)
      .then((r) => {
        if (!cancelled) setVideoInfo(r.video)
      })
      .catch(() => {
        if (!cancelled) setVideoInfo(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedLessonId, stopPolling])

  /* ------------------------------ saving ------------------------------ */

  const saveCourse = async () => {
    if (!course) return
    setSaving(true)
    try {
      await api.patch(`/api/admin/courses/${course.id}`, {
        title: title.trim(),
        slug: slug.trim(),
        shortDescription,
        description,
        thumbnailUrl,
        categoryId,
        level,
        featured,
        objectives: splitLines(objectivesText),
        prerequisites: splitLines(prerequisitesText),
        targetAudience: splitLines(targetAudienceText),
        isFree,
        priceAmount: isFree ? 0 : rupeesToPaise(Number(priceRupees) || 0),
        compareAtPrice:
          isFree || compareRupees.trim() === '' ? null : rupeesToPaise(Number(compareRupees) || 0),
      })
      toast.success('Course saved')
      await refreshCourse()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  /* ---------------------------- curriculum ---------------------------- */

  const addSection = async () => {
    if (!course || !newSectionTitle.trim()) {
      toast.error('Enter a section title first.')
      return
    }
    try {
      await api.post(`/api/admin/courses/${course.id}/sections`, { title: newSectionTitle.trim() })
      setNewSectionTitle('')
      toast.success('Section added')
      await refreshCourse()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const renameSection = async () => {
    if (!editSection || !editSection.title.trim()) return
    try {
      await api.patch(`/api/admin/sections/${editSection.id}`, { title: editSection.title.trim() })
      toast.success('Section renamed')
      setEditSection(null)
      await refreshCourse()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const moveSection = async (index: number, dir: -1 | 1) => {
    const next = [...sections]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setSections(next.map((s, i) => ({ ...s, position: i })))
    try {
      await api.post('/api/admin/lessons/reorder', { type: 'sections', ids: next.map((s) => s.id) })
    } catch (err) {
      toast.error((err as Error).message)
      await refreshCourse()
    }
  }

  const removeSection = async () => {
    if (!deleteSectionTarget) return
    try {
      await api.del(`/api/admin/sections/${deleteSectionTarget.id}`)
      toast.success('Section deleted')
      await refreshCourse()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const openLessonDialog = (sectionId: string, lesson?: Lesson) => {
    setLessonDialog({ open: true, sectionId, lesson: lesson ?? null })
    setLessonTitle(lesson?.title ?? '')
    setLessonDescription(lesson?.description ?? '')
    setLessonPreview(!!lesson?.isPreview)
  }

  const submitLesson = async () => {
    if (!lessonTitle.trim()) {
      toast.error('Lesson title is required.')
      return
    }
    const body = { title: lessonTitle.trim(), description: lessonDescription, isPreview: lessonPreview }
    try {
      if (lessonDialog.lesson) {
        await api.patch(`/api/admin/lessons/${lessonDialog.lesson.id}`, body)
        toast.success('Lesson updated')
      } else {
        await api.post(`/api/admin/sections/${lessonDialog.sectionId}/lessons`, body)
        toast.success('Lesson added')
      }
      setLessonDialog({ open: false, sectionId: '', lesson: null })
      await refreshCourse()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const moveLesson = async (sectionId: string, lessonIndex: number, dir: -1 | 1) => {
    const sec = sections.find((s) => s.id === sectionId)
    if (!sec) return
    const lessons = [...sec.lessons]
    const target = lessonIndex + dir
    if (target < 0 || target >= lessons.length) return
    ;[lessons[lessonIndex], lessons[target]] = [lessons[target], lessons[lessonIndex]]
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, lessons: lessons.map((l, i) => ({ ...l, position: i })) } : s,
      ),
    )
    try {
      await api.post('/api/admin/lessons/reorder', { type: 'lessons', ids: lessons.map((l) => l.id) })
    } catch (err) {
      toast.error((err as Error).message)
      await refreshCourse()
    }
  }

  const removeLesson = async () => {
    if (!deleteLessonTarget) return
    try {
      await api.del(`/api/admin/lessons/${deleteLessonTarget.lesson.id}`)
      toast.success('Lesson deleted')
      await refreshCourse()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  /* --------------------------- video & audio -------------------------- */

  const allLessons = sections.flatMap((s) => s.lessons.map((l) => ({ lesson: l, sectionTitle: s.title })))
  const selectedLesson = allLessons.find((x) => x.lesson.id === selectedLessonId)?.lesson ?? null

  const refreshVideoInfo = useCallback(async () => {
    if (!selectedLessonId) return
    try {
      const r = await api.get<{ video: LessonVideo | null }>(`/api/admin/lessons/${selectedLessonId}/video`)
      setVideoInfo(r.video)
    } catch {
      /* keep current info */
    }
  }, [selectedLessonId])

  const assignVideo = async () => {
    if (!selectedLessonId) return
    if (!videoUrl.trim()) {
      toast.error('Enter a video URL or pick a sample first.')
      return
    }
    setAssigningVideo(true)
    try {
      const body: { videoUrl: string; durationSeconds?: number } = { videoUrl: videoUrl.trim() }
      const dur = Number(videoDuration)
      if (videoDuration.trim() && Number.isFinite(dur) && dur > 0) body.durationSeconds = Math.round(dur)
      const r = await api.post<{ video?: LessonVideo }>(`/api/admin/lessons/${selectedLessonId}/video`, body)
      setVideoInfo(r.video ?? null)
      setVideoUrl('')
      setVideoDuration('')
      toast.success('Video assigned')
      if ((r.video?.processingStatus ?? 'PROCESSING') === 'PROCESSING') startPolling(selectedLessonId)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAssigningVideo(false)
    }
  }

  const removeVideo = async () => {
    if (!selectedLessonId) return
    try {
      await api.del(`/api/admin/lessons/${selectedLessonId}/video`)
      stopPolling()
      setVideoInfo(null)
      toast.success('Video removed')
      await refreshCourse()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const addAudioTrack = async () => {
    if (!selectedLessonId || !audioLang) {
      toast.error('Pick a language first.')
      return
    }
    try {
      await api.post(`/api/admin/lessons/${selectedLessonId}/audio-tracks`, {
        languageCode: audioLang,
        displayName: LANG_NAMES[audioLang] ?? audioLang,
      })
      toast.success('Audio track added')
      setAudioOpen(false)
      setAudioLang('')
      await Promise.all([refreshVideoInfo(), refreshCourse()])
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const deleteAudioTrack = async (id: string) => {
    try {
      await api.del(`/api/admin/audio-tracks/${id}`)
      toast.success('Audio track removed')
      await Promise.all([refreshVideoInfo(), refreshCourse()])
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const addSubtitle = async () => {
    if (!selectedLessonId || !subLang) {
      toast.error('Pick a language first.')
      return
    }
    try {
      await api.post(`/api/admin/lessons/${selectedLessonId}/subtitles`, {
        languageCode: subLang,
        displayName: LANG_NAMES[subLang] ?? subLang,
      })
      toast.success('Subtitle added')
      setSubOpen(false)
      setSubLang('')
      await Promise.all([refreshVideoInfo(), refreshCourse()])
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const deleteSubtitle = async (id: string) => {
    try {
      await api.del(`/api/admin/subtitles/${id}`)
      toast.success('Subtitle removed')
      await Promise.all([refreshVideoInfo(), refreshCourse()])
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  /* ---------------------------- publishing ---------------------------- */

  const checks: { label: string; ok: boolean }[] = [
    { label: 'Title is at least 4 characters', ok: title.trim().length >= 4 },
    { label: 'Short description is at least 20 characters', ok: shortDescription.trim().length >= 20 },
    { label: 'Full description filled in', ok: description.trim().length > 0 },
    { label: 'Thumbnail set', ok: thumbnailUrl.trim().length > 0 },
    { label: 'Category selected', ok: !!categoryId },
    { label: 'Price set or marked as free', ok: isFree || Number(priceRupees) > 0 },
    { label: 'At least one section with one lesson', ok: sections.some((s) => s.lessons.length > 0) },
    {
      label: 'All lesson videos are ready',
      ok: sections.every((s) =>
        s.lessons.every((l) => l.processingStatus === 'READY' || l.processingStatus === 'NO_VIDEO'),
      ),
    },
  ]

  const publishNow = async () => {
    if (!course) return
    setPublishing(true)
    try {
      await api.post(`/api/admin/courses/${course.id}/publish`)
      setPublishProblems(null)
      toast.success('Course published')
      await refreshCourse()
    } catch (err) {
      const e = err as Error & { status?: number }
      if (e.status === 422) {
        const problems = e.message.split('\n').map((s) => s.trim()).filter(Boolean)
        setPublishProblems(problems)
        toast.error('Course needs fixes before publishing', { description: problems[0] })
      } else {
        toast.error(e.message)
      }
    } finally {
      setPublishing(false)
    }
  }

  const unpublishNow = async () => {
    if (!course) return
    try {
      await api.post(`/api/admin/courses/${course.id}/unpublish`)
      toast.success('Course unpublished')
      await refreshCourse()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  /* ------------------------------ renders ----------------------------- */

  // No course id: redirecting to Courses (see effect above).
  if (!courseId) return null

  if (loading) {
    return (
      <AdminShell title="Course Editor">
        <div className="space-y-4">
          <div className="h-8 w-64 animate-pulse rounded bg-secondary" />
          <div className="h-10 w-full animate-pulse rounded bg-secondary" />
          <div className="h-96 w-full animate-pulse rounded-lg bg-secondary" />
        </div>
      </AdminShell>
    )
  }

  if (loadFailed || !course) {
    return (
      <AdminShell title="Course Editor">
        <GlassCard className="flex flex-col items-center gap-3 p-10 text-center">
          <BookOpen className="h-8 w-8 text-primary" />
          <p className="font-semibold">Course not found</p>
          <Button variant="outline" onClick={() => navigate({ name: 'admin-courses' })}>
            Back to courses
          </Button>
        </GlassCard>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Course Editor">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight">{course.title}</h1>
            <PaymentStatusBadge status={course.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">/learn/{course.slug}</p>
        </div>
        <Button variant="outline" className="shrink-0" onClick={() => navigate({ name: 'course', slug: course.slug })}>
          <ExternalLink className="mr-1 h-4 w-4" /> Preview
        </Button>
      </div>

      <Tabs defaultValue="basic" className="mt-5">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="basic">Basic info</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="media">Video &amp; audio</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="publishing">Publishing</TabsTrigger>
        </TabsList>

        {/* ---------------------------- Tab 1 ---------------------------- */}
        <TabsContent value="basic" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <GlassCard className="space-y-4 p-5 lg:col-span-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-title">Title</Label>
                <Input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-slug">Slug</Label>
                <Input id="f-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-short">Short description</Label>
                <Input
                  id="f-short"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="One-line summary shown on cards"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-desc">Description</Label>
                <Textarea
                  id="f-desc"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger aria-label="Category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Level</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger aria-label="Level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Featured course</p>
                  <p className="text-xs text-muted-foreground">Show on the landing page hero area.</p>
                </div>
                <Switch checked={featured} onCheckedChange={setFeatured} aria-label="Featured" />
              </div>
            </GlassCard>

            <div className="space-y-4">
              <GlassCard className="space-y-3 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon className="h-4 w-4 text-primary" /> Thumbnail
                </div>
                <div className="aspect-video w-full overflow-hidden rounded-md bg-secondary">
                  {thumbnailUrl && (
                    <img src={thumbnailUrl} alt="Thumbnail preview" className="h-full w-full object-cover" />
                  )}
                </div>
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="/images/… or https://…"
                  aria-label="Thumbnail URL"
                />
                <div className="flex flex-wrap gap-1.5">
                  {THUMBNAIL_CHIPS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setThumbnailUrl(t)}
                      className={`rounded border px-2 py-1 font-mono text-[10px] transition-colors hover:bg-primary-soft hover:text-primary ${
                        thumbnailUrl === t ? 'border-primary bg-primary-soft text-primary' : 'bg-background/60'
                      }`}
                    >
                      {t.replace('/images/', '')}
                    </button>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {(
              [
                { label: 'Objectives (one per line)', value: objectivesText, set: setObjectivesText, ph: 'What learners will achieve' },
                { label: 'Prerequisites (one per line)', value: prerequisitesText, set: setPrerequisitesText, ph: 'What learners need before starting' },
                { label: 'Target audience (one per line)', value: targetAudienceText, set: setTargetAudienceText, ph: 'Who this course is for' },
              ] as const
            ).map((f) => (
              <GlassCard key={f.label} className="space-y-1.5 p-5">
                <Label htmlFor={`f-${f.label.slice(0, 6)}`}>{f.label}</Label>
                <Textarea
                  id={`f-${f.label.slice(0, 6)}`}
                  rows={4}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.ph}
                />
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        {/* ---------------------------- Tab 2 ---------------------------- */}
        <TabsContent value="curriculum" className="mt-4">
          <GlassCard className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="New section title, e.g. Getting Started"
                onKeyDown={(e) => e.key === 'Enter' && addSection()}
                aria-label="New section title"
              />
              <Button className="primary-button shrink-0" onClick={addSection}>
                <Plus className="mr-1 h-4 w-4" /> Add section
              </Button>
            </div>
          </GlassCard>

          <div className="mt-4 space-y-4">
            {sections.length === 0 && (
              <GlassCard className="flex flex-col items-center gap-2 p-8 text-center">
                <BookOpen className="h-8 w-8 text-primary" />
                <p className="font-semibold">No sections yet</p>
                <p className="text-sm text-muted-foreground">Add your first section above.</p>
              </GlassCard>
            )}
            {sections.map((section, si) => (
              <GlassCard key={section.id} className="p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary-soft text-[11px] font-bold text-primary">
                    {si + 1}
                  </span>
                  <button
                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-primary"
                    onClick={() => setEditSection({ id: section.id, title: section.title })}
                    title="Click to rename"
                  >
                    {section.title}
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={si === 0}
                      onClick={() => moveSection(si, -1)}
                      aria-label="Move section up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={si === sections.length - 1}
                      onClick={() => moveSection(si, 1)}
                      aria-label="Move section down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-rose-600 hover:text-rose-600"
                      onClick={() => setDeleteSectionTarget(section)}
                      aria-label="Delete section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {section.lessons.map((lesson, li) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-2 rounded-md border bg-background/60 px-3 py-2"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(lesson.processingStatus)}`} />
                      <span className="min-w-0 flex-1 truncate text-sm">{lesson.title}</span>
                      {lesson.isPreview && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          Preview
                        </Badge>
                      )}
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={li === 0}
                          onClick={() => moveLesson(section.id, li, -1)}
                          aria-label="Move lesson up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={li === section.lessons.length - 1}
                          onClick={() => moveLesson(section.id, li, 1)}
                          aria-label="Move lesson down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => openLessonDialog(section.id, lesson)}
                          aria-label="Edit lesson"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-rose-600 hover:text-rose-600"
                          onClick={() => setDeleteLessonTarget({ sectionId: section.id, lesson })}
                          aria-label="Delete lesson"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                    onClick={() => openLessonDialog(section.id)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add lesson
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        {/* ---------------------------- Tab 3 ---------------------------- */}
        <TabsContent value="media" className="mt-4">
          <GlassCard className="space-y-4 p-5">
            <div className="max-w-md space-y-1.5">
              <Label>Lesson</Label>
              <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                <SelectTrigger aria-label="Pick a lesson">
                  <SelectValue placeholder="Pick a lesson to manage its media" />
                </SelectTrigger>
                <SelectContent>
                  {allLessons.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No lessons yet</div>
                  )}
                  {allLessons.map(({ lesson, sectionTitle }) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {sectionTitle} › {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedLesson ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Pick a lesson to assign video, audio tracks and subtitles.
              </p>
            ) : (
              <div className="space-y-5">
                {/* Current status */}
                <div className="flex flex-wrap items-center gap-3 rounded-md border bg-background/60 p-3">
                  <PaymentStatusBadge status={selectedLesson.processingStatus} />
                  <span className="text-sm text-muted-foreground">
                    {videoInfo?.durationSeconds || selectedLesson.durationSeconds
                      ? `Duration: ${Math.round((videoInfo?.durationSeconds ?? selectedLesson.durationSeconds ?? 0) / 60)}m`
                      : 'No duration set'}
                  </span>
                  {videoInfo?.videoSourceUrl && (
                    <span className="max-w-xs truncate font-mono text-[11px] text-muted-foreground">
                      {videoInfo.videoSourceUrl}
                    </span>
                  )}
                </div>

                {/* Inline preview */}
                {videoInfo?.videoSourceUrl && (
                  <video controls src={videoInfo.videoSourceUrl} className="aspect-video w-full rounded-md bg-black" />
                )}

                {/* Assign video */}
                <div className="space-y-2 rounded-md border p-4">
                  <p className="text-sm font-semibold">Assign video</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://…/video.mp4"
                      aria-label="Video URL"
                    />
                    <Input
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                      placeholder="Duration (seconds)"
                      type="number"
                      min={0}
                      className="sm:w-44"
                      aria-label="Duration in seconds"
                    />
                    <Button className="primary-button shrink-0" onClick={assignVideo} disabled={assigningVideo}>
                      {assigningVideo ? 'Assigning…' : 'Assign'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SAMPLE_VIDEOS.map((v) => (
                      <button
                        key={v.url}
                        type="button"
                        onClick={() => setVideoUrl(v.url)}
                        className="rounded border bg-background/60 px-2 py-1 text-[11px] transition-colors hover:bg-primary-soft hover:text-primary"
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  {videoInfo?.videoSourceUrl && (
                    <Button variant="outline" size="sm" className="mt-1" onClick={removeVideo}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove video
                    </Button>
                  )}
                </div>

                {/* Audio tracks */}
                <div className="space-y-2 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      <Languages className="h-4 w-4 text-primary" /> Audio tracks
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setAudioOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(videoInfo?.audioTracks ?? selectedLesson.audioTracks ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground">No audio tracks yet.</p>
                    )}
                    {(videoInfo?.audioTracks ?? selectedLesson.audioTracks ?? []).map((t) => (
                      <Badge key={t.id} variant="outline" className="gap-1 pr-1">
                        <Globe className="h-3 w-3 text-primary" />
                        {t.languageCode} · {t.displayName} · {t.status}
                        <button
                          onClick={() => deleteAudioTrack(t.id)}
                          className="ml-0.5 rounded p-0.5 hover:bg-rose-100 hover:text-rose-600"
                          aria-label={`Delete ${t.displayName} audio track`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Subtitles */}
                <div className="space-y-2 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Subtitles</p>
                    <Button variant="outline" size="sm" onClick={() => setSubOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(videoInfo?.subtitles ?? selectedLesson.subtitles ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground">No subtitles yet.</p>
                    )}
                    {(videoInfo?.subtitles ?? selectedLesson.subtitles ?? []).map((s) => (
                      <Badge key={s.id} variant="outline" className="gap-1 pr-1">
                        CC {s.languageCode} · {s.displayName} · {s.status}
                        <button
                          onClick={() => deleteSubtitle(s.id)}
                          className="ml-0.5 rounded p-0.5 hover:bg-rose-100 hover:text-rose-600"
                          aria-label={`Delete ${s.displayName} subtitle`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* ---------------------------- Tab 4 ---------------------------- */}
        <TabsContent value="pricing" className="mt-4">
          <GlassCard className="max-w-xl space-y-4 p-5">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Free course</p>
                <p className="text-xs text-muted-foreground">Learners can enroll without payment.</p>
              </div>
              <Switch checked={isFree} onCheckedChange={setIsFree} aria-label="Free course" />
            </div>

            {!isFree && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="f-price">Price (₹)</Label>
                  <Input
                    id="f-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    placeholder="499"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-compare">Compare-at price (₹, optional)</Label>
                  <Input
                    id="f-compare"
                    type="number"
                    min={0}
                    step="0.01"
                    value={compareRupees}
                    onChange={(e) => setCompareRupees(e.target.value)}
                    placeholder="1999"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Current stored price: {course.isFree ? 'Free' : formatINR(course.priceAmount)}
              {course.compareAtPrice ? ` (was ${formatINR(course.compareAtPrice)})` : ''}
              . Amounts are stored in paise.
            </p>

            <Button className="primary-button" onClick={saveCourse} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save pricing'}
            </Button>
          </GlassCard>
        </TabsContent>

        {/* ---------------------------- Tab 5 ---------------------------- */}
        <TabsContent value="publishing" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GlassCard className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight">Publish requirements</h2>
                <PaymentStatusBadge status={course.status} />
              </div>
              <ul className="space-y-2">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    {c.ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    )}
                    <span className={c.ok ? '' : 'text-muted-foreground'}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            <div className="space-y-4">
              {publishProblems && (
                <GlassCard className="border-rose-200 p-5 dark:border-rose-900">
                  <p className="text-sm font-semibold text-rose-600">Fix these problems before publishing:</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-rose-600">
                    {publishProblems.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </GlassCard>
              )}

              <GlassCard className="space-y-3 p-5">
                <p className="text-sm text-muted-foreground">
                  Publishing makes the course visible in the catalog and open for enrollment.
                </p>
                <div className="flex flex-wrap gap-2">
                  {course.status !== 'PUBLISHED' && (
                    <Button className="primary-button" onClick={publishNow} disabled={publishing}>
                      <Check className="mr-1 h-4 w-4" />
                      {publishing ? 'Validating…' : 'Validate & publish'}
                    </Button>
                  )}
                  {course.status === 'PUBLISHED' && (
                    <Button variant="outline" onClick={unpublishNow}>
                      Unpublish
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => navigate({ name: 'course', slug: course.slug })}>
                    <ExternalLink className="mr-1 h-4 w-4" /> Preview link
                  </Button>
                </div>
              </GlassCard>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-30 mt-6">
        <GlassCard className="flex items-center justify-between gap-3 p-3">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Changes in Basic info and Pricing are applied when you save.
          </p>
          <Button className="primary-button ml-auto" onClick={saveCourse} disabled={saving}>
            <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </GlassCard>
      </div>

      {/* Rename section dialog */}
      <Dialog open={editSection !== null} onOpenChange={(open) => !open && setEditSection(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename section</DialogTitle>
          </DialogHeader>
          <Input
            value={editSection?.title ?? ''}
            onChange={(e) => setEditSection((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
            autoFocus
            aria-label="Section title"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditSection(null)}>
              Cancel
            </Button>
            <Button className="primary-button" onClick={renameSection}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / edit lesson dialog */}
      <Dialog
        open={lessonDialog.open}
        onOpenChange={(open) => !open && setLessonDialog({ open: false, sectionId: '', lesson: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lessonDialog.lesson ? 'Edit lesson' : 'Add lesson'}</DialogTitle>
            {!lessonDialog.lesson && (
              <DialogDescription>Lessons hold the video content of a section.</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="lesson-title">Title</Label>
              <Input
                id="lesson-title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="e.g. Installing your tools"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lesson-desc">Description</Label>
              <Textarea
                id="lesson-desc"
                rows={3}
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={lessonPreview} onCheckedChange={(v) => setLessonPreview(v === true)} />
              Free preview lesson
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLessonDialog({ open: false, sectionId: '', lesson: null })}>
              Cancel
            </Button>
            <Button className="primary-button" onClick={submitLesson}>
              {lessonDialog.lesson ? 'Save lesson' : 'Add lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add audio track dialog */}
      <Dialog open={audioOpen} onOpenChange={setAudioOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add audio track</DialogTitle>
            <DialogDescription>Dubbed narration language for this lesson.</DialogDescription>
          </DialogHeader>
          <Select value={audioLang} onValueChange={setAudioLang}>
            <SelectTrigger aria-label="Audio language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LANG_NAMES).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAudioOpen(false)}>
              Cancel
            </Button>
            <Button className="primary-button" onClick={addAudioTrack} disabled={!audioLang}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add subtitle dialog */}
      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add subtitle</DialogTitle>
            <DialogDescription>Caption language for this lesson.</DialogDescription>
          </DialogHeader>
          <Select value={subLang} onValueChange={setSubLang}>
            <SelectTrigger aria-label="Subtitle language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LANG_NAMES).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSubOpen(false)}>
              Cancel
            </Button>
            <Button className="primary-button" onClick={addSubtitle} disabled={!subLang}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete section confirm */}
      <ConfirmDialog
        open={deleteSectionTarget !== null}
        onOpenChange={(open) => !open && setDeleteSectionTarget(null)}
        title="Delete section?"
        description={`"${deleteSectionTarget?.title ?? ''}" and its lessons will be removed.`}
        confirmLabel="Delete"
        onConfirm={removeSection}
      />

      {/* Delete lesson confirm */}
      <ConfirmDialog
        open={deleteLessonTarget !== null}
        onOpenChange={(open) => !open && setDeleteLessonTarget(null)}
        title="Delete lesson?"
        description={`"${deleteLessonTarget?.lesson.title ?? ''}" will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={removeLesson}
      />
    </AdminShell>
  )
}
