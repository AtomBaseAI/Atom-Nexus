'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n'
import { formatClock } from '@/lib/money'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Check,
  Captions,
  Gauge,
  Globe,
  Maximize,
  Minimize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'

export type PlaybackSource = { languageCode: string; displayName: string; isPrimary: boolean; url: string }
export type PlaybackSubtitle = { languageCode: string; displayName: string; url: string }

/**
 * Course video player.
 * - Custom controls (play, seek, volume, speed, fullscreen)
 * - Audio language switching (demo: source swap preserving position; Mux: native tracks)
 * - Subtitle selection via WebVTT tracks
 * - Resumes from the server-side saved position
 * - Emits throttled progress + completion events (server validates values)
 */
export function CoursePlayer({
  sources,
  subtitles,
  initialPosition,
  initialAudio,
  initialSubtitle,
  completed,
  onProgress,
  onComplete,
  onAudioChanged,
  onSubtitleChanged,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: {
  sources: PlaybackSource[]
  subtitles: PlaybackSubtitle[]
  initialPosition: number
  initialAudio?: string
  initialSubtitle?: string
  completed: boolean
  onProgress: (p: { position: number; watched: number; duration: number }) => void
  onComplete: () => void
  onAudioChanged?: (name: string) => void
  onSubtitleChanged?: (name: string) => void
  onNext?: () => void
  onPrev?: () => void
  hasNext: boolean
  hasPrev: boolean
}) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)

  const [audioCode, setAudioCode] = useState<string>(
    initialAudio ?? sources.find((s) => s.isPrimary)?.languageCode ?? sources[0]?.languageCode ?? ''
  )
  const [subCode, setSubCode] = useState<string>(initialSubtitle ?? 'off')
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [showBigPlay, setShowBigPlay] = useState(true)

  // refs for throttled progress saving
  const watchedRef = useRef(0)
  const lastTickRef = useRef<number | null>(null)
  const lastSavedRef = useRef(0)
  const completedRef = useRef(completed)
  const pendingResumeRef = useRef<number>(initialPosition > 3 ? initialPosition : 0)
  const seekingRef = useRef(false)

  // Derived during render: the source matching the selected audio language.
  // (The player is remounted per lesson via `key`, so no reset effect is needed.)
  const activeSource = sources.find((s) => s.languageCode === audioCode) ?? sources[0]
  const currentSrc = activeSource?.url ?? ''

  const saveProgress = useCallback(
    (position: number, dur: number) => {
      onProgress({ position, watched: Math.round(watchedRef.current), duration: dur })
      lastSavedRef.current = position
    },
    [onProgress]
  )

  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (!video) return
    setDuration(video.duration || 0)
    if (pendingResumeRef.current > 0 && pendingResumeRef.current < video.duration - 2) {
      video.currentTime = pendingResumeRef.current
      pendingResumeRef.current = 0
    }
  }

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video || seekingRef.current) return
    const now = video.currentTime
    setCurrent(now)

    // Accumulate watched time only while playing.
    if (!video.paused) {
      const last = lastTickRef.current
      if (last !== null && now > last && now - last < 2) {
        watchedRef.current += now - last
      }
      lastTickRef.current = now
    }

    // Throttled server save: every 10s of playback.
    if (!video.paused && now - lastSavedRef.current >= 10) {
      saveProgress(now, video.duration || 0)
    }

    // Auto-complete at >= 90%.
    if (
      !completedRef.current &&
      video.duration > 0 &&
      now / video.duration >= 0.9 &&
      (video.duration < 30 || watchedRef.current / video.duration >= 0.5)
    ) {
      completedRef.current = true
      onComplete()
    }
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => undefined)
    } else {
      video.pause()
      saveProgress(video.currentTime, video.duration || 0)
    }
  }

  const handleSeek = (value: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = value
    setCurrent(value)
  }

  const changeAudio = (code: string, name: string) => {
    if (code === audioCode) return
    const video = videoRef.current
    const time = video?.currentTime ?? 0
    const wasPlaying = video ? !video.paused : false
    pendingResumeRef.current = time
    watchedRef.current += 0 // position is preserved; watched keeps accumulating
    lastTickRef.current = time
    setAudioCode(code)
    // After src swap, restore state
    requestAnimationFrame(() => {
      const v = videoRef.current
      if (!v) return
      const restore = () => {
        if (time > 0 && time < (v.duration || Infinity) - 1) v.currentTime = time
        if (wasPlaying) v.play().catch(() => undefined)
      }
      if (v.readyState >= 1) restore()
      else v.addEventListener('loadedmetadata', restore, { once: true })
    })
    onAudioChanged?.(name)
  }

  const changeSubtitle = (code: string, name: string) => {
    setSubCode(code)
    const video = videoRef.current
    if (!video) return
    const tracks = video.textTracks
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]
      track.mode = track.language === code && code !== 'off' ? 'showing' : 'disabled'
    }
    if (code !== 'off') onSubtitleChanged?.(name)
  }

  const toggleFullscreen = async () => {
    const shell = shellRef.current
    if (!shell) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await shell.requestFullscreen()
      }
    } catch {
      /* unsupported */
    }
  }

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Save progress on unmount / tab hide.
  useEffect(() => {
    const video = videoRef.current
    return () => {
      if (video && video.currentTime > 0) {
        saveProgress(video.currentTime, video.duration || 0)
      }
    }
  }, [saveProgress])

  // Apply subtitle track modes whenever subCode or subtitles change.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const tracks = video.textTracks
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]
      track.mode = track.language === subCode ? 'showing' : 'disabled'
    }
  }, [subCode, currentSrc])

  const pct = duration > 0 ? (current / duration) * 100 : 0
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

  return (
    <div ref={shellRef} className="player-shell overflow-hidden rounded-lg bg-[#14101f] shadow-lg">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          src={currentSrc || undefined}
          className="h-full w-full"
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => {
            setPlaying(true)
            setShowBigPlay(false)
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            const video = videoRef.current
            if (video) saveProgress(video.duration, video.duration)
            if (!completedRef.current) {
              completedRef.current = true
              onComplete()
            }
            if (hasNext) onNext?.()
          }}
          onClick={togglePlay}
        >
          {subtitles.map((s) => (
            <track
              key={s.languageCode}
              kind="subtitles"
              src={s.url}
              srcLang={s.languageCode}
              label={s.displayName}
              default={subCode === s.languageCode}
            />
          ))}
        </video>

        {showBigPlay && !playing && (
          <button
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 text-white shadow-xl transition-transform hover:scale-105"
          >
            <Play className="ml-1 h-7 w-7" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-2 px-3 pb-3 pt-2 text-white">
        <div className="relative h-1.5 w-full cursor-pointer rounded-full bg-white/15" onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
          handleSeek(ratio * duration)
        }}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-100" style={{ width: `${pct}%` }} />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5">
            <button onClick={togglePlay} className="rounded p-2 hover:bg-white/10" aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              onClick={() => handleSeek(Math.max(0, current - 10))}
              className="rounded p-2 hover:bg-white/10"
              aria-label="Back 10 seconds"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleSeek(Math.min(duration, current + 10))}
              className="rounded p-2 hover:bg-white/10"
              aria-label="Forward 10 seconds"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <div className="group/vol flex items-center">
              <button
                onClick={() => {
                  setMuted(!muted)
                  if (videoRef.current) videoRef.current.muted = !muted
                }}
                className="rounded p-2 hover:bg-white/10"
                aria-label="Mute"
              >
                {muted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" size={18} /> : <Volume2 className="h-4.5 w-4.5" size={18} />}
              </button>
              <input
                type="range"
                className="player-range hidden w-0 opacity-0 transition-all group-hover/vol:w-16 group-hover/vol:opacity-100 sm:block"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setVolume(v)
                  setMuted(v === 0)
                  if (videoRef.current) {
                    videoRef.current.volume = v
                    videoRef.current.muted = v === 0
                  }
                }}
                style={{ background: `linear-gradient(to right, #7700ff ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(muted ? 0 : volume) * 100}%)` }}
              />
            </div>
            <span className="ml-1 text-xs tabular-nums text-white/80">
              {formatClock(current)} / {formatClock(duration)}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Audio language */}
            {sources.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 rounded p-2 text-xs hover:bg-white/10" aria-label={t('player.audio')}>
                    <Globe className="h-4.5 w-4.5" size={18} />
                    <span className="hidden uppercase sm:inline">{audioCode}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs">{t('player.audio')}</DropdownMenuLabel>
                  {sources.map((s) => (
                    <DropdownMenuItem key={s.languageCode} onClick={() => changeAudio(s.languageCode, s.displayName)} className="justify-between">
                      <span>{s.displayName}</span>
                      {audioCode === s.languageCode && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Subtitles */}
            {subtitles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn('rounded p-2 hover:bg-white/10', subCode !== 'off' && 'text-primary-foreground bg-white/10')} aria-label={t('player.subtitles')}>
                    <Captions className="h-4.5 w-4.5" size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs">{t('player.subtitles')}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => changeSubtitle('off', t('player.off'))} className="justify-between">
                    <span>{t('player.off')}</span>
                    {subCode === 'off' && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                  {subtitles.map((s) => (
                    <DropdownMenuItem key={s.languageCode} onClick={() => changeSubtitle(s.languageCode, s.displayName)} className="justify-between">
                      <span>{s.displayName}</span>
                      {subCode === s.languageCode && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Speed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 rounded p-2 text-xs hover:bg-white/10" aria-label={t('player.speed')}>
                  <Gauge className="h-4.5 w-4.5" size={18} />
                  <span className="hidden sm:inline">{speed}x</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">{t('player.speed')}</DropdownMenuLabel>
                {speeds.map((sp) => (
                  <DropdownMenuItem
                    key={sp}
                    onClick={() => {
                      setSpeed(sp)
                      if (videoRef.current) videoRef.current.playbackRate = sp
                    }}
                    className="justify-between"
                  >
                    <span>{sp === 1 ? t('player.normal') : `${sp}x`}</span>
                    {speed === sp && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={toggleFullscreen} className="rounded p-2 hover:bg-white/10" aria-label="Fullscreen">
              {fullscreen ? <Minimize className="h-4.5 w-4.5" size={18} /> : <Maximize className="h-4.5 w-4.5" size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

