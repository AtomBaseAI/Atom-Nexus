'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n, type DictKey } from '@/i18n'
import { useNavStore, type View } from '@/stores/nav-store'
import { useAuthStore } from '@/stores/auth-store'
import { useTheme } from 'next-themes'
import { api } from '@/lib/api'
import {
  Award,
  BarChart3,
  BookOpen,
  Compass,
  CreditCard,
  FilePlus2,
  Film,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  Receipt,
  Settings,
  Sun,
  Tags,
  User,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

type CourseHit = { id: string; title: string; slug: string; thumbnailUrl?: string }

type NavEntry = { view: View; labelKey: DictKey; icon: React.ComponentType<{ className?: string }> }

/**
 * Global command palette (⌘K / Ctrl+K):
 * quick navigation, cross-area jumps, course search and theme switching.
 */
export function CommandPalette({
  open,
  onOpenChange,
  kind,
  navEntries,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: 'learn' | 'admin'
  navEntries: NavEntry[]
}) {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const resetTo = useNavStore((s) => s.resetTo)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { resolvedTheme, setTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<CourseHit[]>([])
  const [searching, setSearching] = useState(false)
  const seqRef = useRef(0)

  // Reset the search box every time the palette opens.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next && !open) {
        setQuery('')
        setHits([])
        setSearching(false)
      }
      onOpenChange(next)
    },
    [open, onOpenChange],
  )

  // Global shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, handleOpenChange])

  // Debounced course search
  useEffect(() => {
    const q = query.trim()
    const seq = ++seqRef.current
    const timer = setTimeout(
      () => {
        if (seqRef.current !== seq) return
        if (q.length < 2) {
          setHits([])
          setSearching(false)
          return
        }
        setSearching(true)
        api
          .get<{ courses: CourseHit[] }>(`/api/courses?search=${encodeURIComponent(q)}`)
          .then((r) => {
            if (seqRef.current === seq) setHits((r.courses ?? []).slice(0, 6))
          })
          .catch(() => {
            if (seqRef.current === seq) setHits([])
          })
          .finally(() => {
            if (seqRef.current === seq) setSearching(false)
          })
      },
      q.length < 2 ? 0 : 250,
    )
    return () => clearTimeout(timer)
  }, [query])

  const run = useCallback(
    (fn: () => void) => {
      onOpenChange(false)
      fn()
    },
    [onOpenChange],
  )

  const go = (v: View) => run(() => navigate(v))

  const handleLogout = async () => {
    onOpenChange(false)
    await logout()
    toast.success(t('toast.logoutSuccess'))
    resetTo({ name: 'landing' })
  }

  const isAdmin = user?.role === 'ADMIN'
  const otherKind: View = kind === 'admin' ? { name: 'learn' } : { name: 'admin' }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      className="sm:max-w-[560px]"
      title={t('search.title')}
      description={t('search.subtitle')}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={t('search.placeholder')}
        autoFocus
      />
      <CommandList className="max-h-[380px]">
        <CommandEmpty>
          {searching ? t('search.searching') : t('search.noResults')}
        </CommandEmpty>

        {query.trim().length >= 2 && hits.length > 0 && (
          <CommandGroup heading={t('search.courses')}>
            {hits.map((c) => (
              <CommandItem
                key={c.id}
                value={`course-${c.title}`}
                onSelect={() => go({ name: 'course', slug: c.slug })}
              >
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{c.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{t('dash.viewCourse')}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading={kind === 'admin' ? t('cmd.adminArea') : t('cmd.learnArea')}>
          {navEntries.map((e) => (
            <CommandItem key={e.view.name} value={`${e.labelKey}-${e.view.name}`} onSelect={() => go(e.view)}>
              <e.icon className="h-4 w-4 text-muted-foreground" />
              <span>{t(e.labelKey)}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading={t('cmd.quickActions')}>
          <CommandItem value="home-site" onSelect={() => go({ name: 'landing' })}>
            <Home className="h-4 w-4 text-muted-foreground" />
            <span>{t('nav.home')}</span>
          </CommandItem>
          <CommandItem value="explore-catalog" onSelect={() => go({ name: 'catalog' })}>
            <Compass className="h-4 w-4 text-muted-foreground" />
            <span>{t('nav.explore')}</span>
          </CommandItem>
          {isAdmin && (
            <CommandItem value="switch-area" onSelect={() => go(otherKind)}>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>{kind === 'admin' ? t('nav.dashboard') : t('nav.adminPanel')}</span>
            </CommandItem>
          )}
          {isAdmin && (
            <CommandItem value="new-course" onSelect={() => go({ name: 'admin-courses' })}>
              <FilePlus2 className="h-4 w-4 text-muted-foreground" />
              <span>{t('cmd.newCourse')}</span>
            </CommandItem>
          )}
          <CommandItem value="theme-toggle" onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}>
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
            <span>{resolvedTheme === 'dark' ? t('cmd.lightMode') : t('cmd.darkMode')}</span>
          </CommandItem>
          <CommandItem value="logout" onSelect={handleLogout}>
            <LogOut className="h-4 w-4 text-muted-foreground" />
            <span>{t('nav.logout')}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

/** Shared nav entry lists for the palette (kept next to the palette for cohesion). */
export const LEARN_NAV_ENTRIES: NavEntry[] = [
  { view: { name: 'learn' }, labelKey: 'dash.overview', icon: LayoutDashboard },
  { view: { name: 'learn-courses' }, labelKey: 'dash.myLearning', icon: BookOpen },
  { view: { name: 'learn-orders' }, labelKey: 'dash.orders', icon: Receipt },
  { view: { name: 'learn-certificates' }, labelKey: 'dash.certificates', icon: Award },
  { view: { name: 'learn-profile' }, labelKey: 'dash.profile', icon: User },
]

export const ADMIN_NAV_ENTRIES: NavEntry[] = [
  { view: { name: 'admin' }, labelKey: 'nav.adminPanel', icon: LayoutDashboard },
  { view: { name: 'admin-courses' }, labelKey: 'admin.courses', icon: BookOpen },
  { view: { name: 'admin-categories' }, labelKey: 'admin.categories', icon: Tags },
  { view: { name: 'admin-media' }, labelKey: 'admin.media', icon: Film },
  { view: { name: 'admin-learners' }, labelKey: 'admin.learners', icon: Users },
  { view: { name: 'admin-enrollments' }, labelKey: 'admin.enrollments', icon: GraduationCap },
  { view: { name: 'admin-payments' }, labelKey: 'admin.payments', icon: CreditCard },
  { view: { name: 'admin-analytics' }, labelKey: 'admin.analytics', icon: BarChart3 },
  { view: { name: 'admin-settings' }, labelKey: 'admin.settings', icon: Settings },
]

// Re-export the shared type for shells.
export type { NavEntry }
