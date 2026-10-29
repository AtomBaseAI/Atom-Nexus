'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { useNavStore } from '@/stores/nav-store'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, BookOpen, CircleAlert, PlayCircle, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

type NotificationItem = {
  id: string
  kind: 'problem' | 'purchase' | 'continue'
  title: string
  description: string
  amountLabel?: string
  at?: string
  onClick: () => void
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

/**
 * Role-aware notifications bell:
 * - admin: media processing issues + recent purchases
 * - learner: courses to continue
 */
export function NotificationsMenu({ kind }: { kind: 'learn' | 'admin' }) {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const [items, setItems] = useState<NotificationItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    if (kind === 'admin') {
      api
        .get<{
          recentPurchases?: { id: string; courseTitle: string; learnerName: string; amount: number; status: string; createdAt: string }[]
          processingProblems?: { id: string; lessonTitle: string; courseTitle: string; processingStatus: string }[]
          popularCourses?: { id: string; title: string; slug: string }[]
        }>('/api/admin/stats')
        .then((r) => {
          if (cancelled) return
          const list: NotificationItem[] = []
          for (const p of r.processingProblems ?? []) {
            list.push({
              id: `problem-${p.id}`,
              kind: 'problem',
              title: p.lessonTitle,
              description: `${t('notif.problem')} · ${p.courseTitle}`,
              onClick: () => navigate({ name: 'admin-media' }),
            })
          }
          for (const o of (r.recentPurchases ?? []).slice(0, 4)) {
            list.push({
              id: `purchase-${o.id}`,
              kind: 'purchase',
              title: o.courseTitle,
              description: `${t('notif.purchase')} · ${o.learnerName}`,
              amountLabel: formatINR(o.amount),
              at: o.createdAt,
              onClick: () => navigate({ name: 'admin-payments' }),
            })
          }
          setItems(list.slice(0, 8))
        })
        .catch(() => !cancelled && setItems([]))
    } else {
      api
        .get<{
          enrollments: {
            enrollmentId: string
            lastAccessedAt: string | null
            progress: { isCompleted: boolean; percent: number; resumeLessonId: string | null }
            course: { id: string; title: string }
          }[]
        }>('/api/learn/my-courses')
        .then((r) => {
          if (cancelled) return
          const list: NotificationItem[] = (r.enrollments ?? [])
            .filter((e) => !e.progress.isCompleted)
            .slice(0, 5)
            .map((e) => ({
              id: `continue-${e.enrollmentId}`,
              kind: 'continue' as const,
              title: e.course.title,
              description: `${e.progress.percent}% ${t('dash.inProgress').toLowerCase()}`,
              onClick: () =>
                navigate({ name: 'player', courseId: e.course.id, lessonId: e.progress.resumeLessonId ?? undefined }),
            }))
          setItems(list)
        })
        .catch(() => !cancelled && setItems([]))
    }
    return () => {
      cancelled = true
    }
  }, [kind, navigate, t])

  const count = items?.length ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={t('notif.title')}
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold leading-none">{t('notif.title')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('notif.subtitle')}</p>
          </div>
          {count > 0 && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
              {count}
            </span>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <ScrollArea className="max-h-80">
          <div className="p-1.5">
            {items === null ? (
              <div className="space-y-2 p-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-md bg-muted/60" />
                ))}
              </div>
            ) : count === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell className="h-6 w-6 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">{t('notif.empty')}</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => n.onClick()}
                  className="flex w-full items-start gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                      n.kind === 'problem'
                        ? 'bg-destructive/10 text-destructive'
                        : n.kind === 'purchase'
                          ? 'bg-emerald-600/10 text-emerald-600'
                          : 'bg-primary-soft text-primary',
                    )}
                  >
                    {n.kind === 'problem' ? (
                      <CircleAlert className="h-4 w-4" />
                    ) : n.kind === 'purchase' ? (
                      <ShoppingCart className="h-4 w-4" />
                    ) : n.kind === 'continue' ? (
                      <PlayCircle className="h-4 w-4" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      {n.amountLabel && (
                        <span className="shrink-0 text-xs font-semibold text-emerald-600">{n.amountLabel}</span>
                      )}
                      {n.at && !n.amountLabel && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">{fmtDate(n.at)}</span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.description}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
