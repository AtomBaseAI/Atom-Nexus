'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type ColumnDef } from '@tanstack/react-table'
import { api } from '@/lib/api'
import { formatDuration } from '@/lib/money'
import { AdminShell } from './AdminShell'
import { DataTable } from '@/components/shared/data-table/DataTable'
import { PaymentStatusBadge } from '@/components/shared/PaymentStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Captions, Film, Globe } from 'lucide-react'

type MediaVideo = {
  id: string
  title: string
  course?: { id: string; title: string; status: string } | null
  sectionTitle?: string | null
  section?: { id: string; title: string } | null
  processingStatus: string
  durationSeconds: number | null
  audioTracks?: { languageCode: string; displayName?: string; status?: string }[]
  subtitles?: { languageCode: string; displayName?: string; status?: string }[]
  assetId?: string | null
  playbackId?: string | null
  muxAssetId?: string | null
  muxPlaybackId?: string | null
  updatedAt: string
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_OPTIONS = [
  { value: 'READY', label: 'Ready' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'NO_VIDEO', label: 'No video' },
]

export function AdminMediaView() {
  const [data, setData] = useState<{ mode: string; videos: MediaVideo[] } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(() => {
    api
      .get<{ mode: string; videos: MediaVideo[] }>('/api/admin/media')
      .then(setData)
      .catch((err: Error) => {
        setData({ mode: 'demo', videos: [] })
        toast.error(err.message)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const isDemo = (data?.mode ?? 'demo') === 'demo'
  const videos = data?.videos ?? []

  const columns = useMemo<ColumnDef<MediaVideo>[]>(
    () => [
      {
        accessorKey: 'title',
        meta: { label: 'Video' },
        cell: ({ getValue }) => (
          <span className="block max-w-48 truncate text-sm font-medium" title={String(getValue())}>
            {String(getValue())}
          </span>
        ),
      },
      {
        id: 'course',
        accessorFn: (v) => v.course?.title ?? '',
        meta: { label: 'Course' },
        cell: ({ row }) => {
          const v = row.original
          return v.course ? (
            <div className="flex flex-col gap-1">
              <span className="max-w-40 truncate text-sm" title={v.course.title}>
                {v.course.title}
              </span>
              <PaymentStatusBadge status={v.course.status} className="w-fit text-[10px]" />
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
      {
        id: 'section',
        accessorFn: (v) => v.sectionTitle ?? v.section?.title ?? '',
        meta: { label: 'Section' },
        cell: ({ getValue }) => (
          <span className="block max-w-36 truncate text-sm text-muted-foreground" title={String(getValue())}>
            {(getValue() as string) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'processingStatus',
        filterFn: 'equalsString',
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <PaymentStatusBadge
            status={row.original.processingStatus}
            className={row.original.processingStatus === 'PROCESSING' ? 'animate-pulse' : ''}
          />
        ),
      },
      {
        id: 'duration',
        accessorFn: (v) => v.durationSeconds ?? 0,
        meta: { label: 'Duration', csv: (v) => v.durationSeconds ?? 0 },
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums">
            {row.original.durationSeconds ? formatDuration(row.original.durationSeconds) : '—'}
          </span>
        ),
      },
      {
        id: 'tracks',
        accessorFn: (v) =>
          [...(v.audioTracks ?? []), ...(v.subtitles ?? [])]
            .map((t) => t.languageCode)
            .join(' '),
        enableSorting: false,
        meta: {
          label: 'Tracks',
          csv: (v) =>
            [...(v.audioTracks ?? []), ...(v.subtitles ?? [])]
              .map((t) => t.languageCode)
              .join(' ') || '—',
        },
        cell: ({ row }) => {
          const v = row.original
          const hasTracks = (v.audioTracks ?? []).length > 0 || (v.subtitles ?? []).length > 0
          return (
            <div className="flex max-w-40 flex-wrap gap-1">
              {(v.audioTracks ?? []).map((t, i) => (
                <Badge key={`a-${i}`} variant="outline" className="gap-0.5 text-[10px]">
                  <Globe className="h-2.5 w-2.5" /> {t.languageCode}
                </Badge>
              ))}
              {(v.subtitles ?? []).map((s, i) => (
                <Badge key={`s-${i}`} variant="outline" className="gap-0.5 text-[10px]">
                  <Captions className="h-2.5 w-2.5" /> {s.languageCode}
                </Badge>
              ))}
              {!hasTracks && <span className="text-xs text-muted-foreground">—</span>}
            </div>
          )
        },
      },
      {
        id: 'assetIds',
        accessorFn: (v) => `${v.muxAssetId ?? v.assetId ?? ''} ${v.muxPlaybackId ?? v.playbackId ?? ''}`,
        enableSorting: false,
        meta: {
          label: 'Asset / Playback IDs',
          csv: (v) => `${v.muxAssetId ?? v.assetId ?? ''} / ${v.muxPlaybackId ?? v.playbackId ?? ''}`,
        },
        cell: ({ row }) => {
          const v = row.original
          const assetId = v.muxAssetId ?? v.assetId
          const playbackId = v.muxPlaybackId ?? v.playbackId
          return (
            <div className="space-y-0.5 font-mono text-[10px] text-muted-foreground">
              <p className="max-w-32 truncate" title={assetId ?? ''}>
                asset: {assetId ?? '—'}
              </p>
              <p className="max-w-32 truncate" title={playbackId ?? ''}>
                play: {playbackId ?? '—'}
              </p>
            </div>
          )
        },
      },
      {
        id: 'updatedAt',
        accessorFn: (v) => new Date(v.updatedAt).getTime(),
        meta: { label: 'Updated', csv: (v) => fmtDate(v.updatedAt) },
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {fmtDate(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <AdminShell title="Media Library">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every uploaded lesson video and its processing state.</p>
        </div>
        <Badge
          className={`w-fit border-0 ${
            isDemo
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          }`}
        >
          {isDemo ? 'Demo storage (add Mux keys for live streaming)' : 'Mux connected'}
        </Badge>
      </div>

      <div className="mt-5">
        <DataTable
          columns={columns}
          data={videos}
          isLoading={data === null}
          loadingRows={6}
          searchPlaceholder="Search video, course or asset ID…"
          facets={[{ columnId: 'processingStatus', label: 'Status', options: STATUS_OPTIONS }]}
          getRowId={(v) => v.id}
          exportFileName="media-library"
          initialSorting={[{ id: 'updatedAt', desc: true }]}
          onRefresh={() => setReloadKey((k) => k + 1)}
          emptyState={{
            icon: Film,
            title: 'No videos yet',
            description: 'Assign a video to a lesson from the course editor and it will appear here.',
          }}
        />
      </div>
    </AdminShell>
  )
}
