'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n, type DictKey } from '@/i18n'
import { useNavStore, type View } from '@/stores/nav-store'
import { useAuthStore } from '@/stores/auth-store'
import { LanguageSelector } from '@/components/shared/LanguageSelector'
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler'
import { NotificationsMenu } from '@/components/layout/NotificationsMenu'
import { CommandPalette, type NavEntry } from '@/components/layout/CommandPalette'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  ChevronsUpDown,
  Atom,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

export type NavItem = { view: View; labelKey: DictKey; icon: LucideIcon }
export type NavGroup = { titleKey?: DictKey; items: NavItem[] }

const COLLAPSE_KEY = 'lms-sidebar-collapsed'

/**
 * Dashboard shell — modern console layout:
 *  • Fixed full-height sidebar (grouped nav, collapse-to-rail, user card)
 *  • Clean topbar (page title · ⌘K search · notifications · language · theme)
 *  • Independently scrolling content column
 * Mobile: sidebar collapses into a sheet; topbar keeps a compact menu.
 */
export function DashboardShell({
  kind,
  groups,
  title,
  children,
}: {
  kind: 'learn' | 'admin'
  groups: NavGroup[]
  title?: string
  children: React.ReactNode
}) {
  const { t } = useI18n()
  const view = useNavStore((s) => s.view)
  const navigate = useNavStore((s) => s.navigate)
  const resetTo = useNavStore((s) => s.resetTo)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  // Restore collapse preference (deferred a tick to avoid a sync setState in effect).
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1')
      } catch {
        /* storage unavailable */
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }

  // Scroll the content column (not the window) when the view changes.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [view])

  const isActive = (v: View) => {
    const activeName = view.name
    if (v.name === 'admin-courses') return activeName === 'admin-courses' || activeName === 'admin-editor'
    return v.name === activeName
  }

  const go = (v: View) => {
    setMobileOpen(false)
    navigate(v)
  }

  const handleLogout = async () => {
    await logout()
    toast.success(t('toast.logoutSuccess'))
    resetTo({ name: 'landing' })
  }

  const navEntries: NavEntry[] = groups.flatMap((g) => g.items)

  /* ---------------- Sidebar nav (shared desktop / mobile) ---------------- */
  const renderGroups = (onNavigate?: () => void, rail = false) => (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-4">
        {groups.map((group, gi) => (
          <div key={group.titleKey ?? gi} className="flex flex-col gap-1">
            {!rail && group.titleKey && (
              <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {t(group.titleKey)}
              </p>
            )}
            {rail && <div className="mx-2 mb-1 border-t" aria-hidden />}
            {group.items.map((item) => {
              const active = isActive(item.view)
              const button = (
                <button
                  key={item.view.name}
                  onClick={() => {
                    go(item.view)
                    onNavigate?.()
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring',
                    rail && 'justify-center px-0 py-2.5',
                    active
                      ? 'bg-primary-soft text-primary'
                      : 'text-foreground/70 hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {/* Active rail indicator */}
                  {active && (
                    <span
                      className={cn(
                        'absolute left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary',
                        'top-1/2',
                      )}
                      aria-hidden
                    />
                  )}
                  <item.icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                  {!rail && <span className="truncate">{t(item.labelKey)}</span>}
                </button>
              )
              return rail ? (
                <Tooltip key={item.view.name}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {t(item.labelKey)}
                  </TooltipContent>
                </Tooltip>
              ) : (
                button
              )
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  )

  /* ---------------- Sidebar footer user card ---------------- */
  const renderUserCard = (rail = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md p-2 text-left outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring',
            rail && 'justify-center p-1.5',
          )}
          aria-label={t('shell.workspace')}
        >
          <Avatar className="h-8 w-8 shrink-0 border">
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
              {user?.name?.slice(0, 2).toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          {!rail && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold leading-tight">{user?.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
          <p className="mt-1 inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {user?.role === 'ADMIN' ? 'Admin' : 'Learner'}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => go({ name: 'learn-profile' })}>
          <UserIcon className="h-4 w-4" /> {t('dash.profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => go({ name: 'landing' })}>
          <Home className="h-4 w-4" /> {t('shell.viewSite')}
        </DropdownMenuItem>
        {user?.role === 'ADMIN' && (
          <DropdownMenuItem onClick={() => go(kind === 'admin' ? { name: 'learn' } : { name: 'admin' })}>
            <GraduationCap className="h-4 w-4" />
            {kind === 'admin' ? t('shell.goLearn') : t('shell.goAdmin')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> {t('nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  /* ---------------- Sidebar shell (brand mark + search + nav) ---------------- */
  const renderSidebarInner = (rail = false, onNavigate?: () => void) => (
    <>
      {/* Brand mark */}
      <div className={cn('flex items-center gap-2 px-3 pt-4 pb-2', rail && 'justify-center px-0')}>
        <button
          onClick={() => go({ name: 'landing' })}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#a45cff] text-primary-foreground shadow-md shadow-primary/25 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('nav.home')}
        >
          <Atom className="h-5 w-5" />
        </button>
        {!rail && (
          <button
            onClick={toggleCollapse}
            className="ml-auto hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:flex"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* Search trigger */}
      <div className={cn('px-3 pb-2', rail && 'px-2')}>
        {rail ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setPaletteOpen(true)}
                  aria-label={t('shell.search')}
                >
                  <Search className="h-[18px] w-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {t('shell.search')} <span className="ml-1 text-muted-foreground">⌘K</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-full items-center gap-2 rounded-md border bg-background/60 px-3 text-sm text-muted-foreground outline-none transition-colors hover:border-input hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate text-left">{t('shell.searchHint')}</span>
            <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      {/* Scrollable nav */}
      <nav
        className={cn('flex-1 overflow-y-auto px-3 py-2', rail && 'px-2')}
        aria-label={kind === 'admin' ? 'Admin' : 'Learner'}
      >
        {renderGroups(onNavigate, rail)}
      </nav>

      <Separator className="mx-3 w-auto" />
      <div className={cn('p-3', rail && 'px-2')}>{renderUserCard(rail)}</div>
    </>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="dashboard-aurora" aria-hidden />

      {/* ---------- Desktop sidebar ---------- */}
      <aside
        className={cn(
          'relative z-30 hidden shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 ease-in-out lg:flex',
          collapsed ? 'w-[76px]' : 'w-[264px]',
        )}
      >
        {renderSidebarInner(collapsed)}

        {/* Expand toggle (rail mode) */}
        {collapsed && (
          <button
            onClick={toggleCollapse}
            className="absolute -right-3 top-[72px] z-40 hidden h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground lg:flex"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
          </button>
        )}
      </aside>

      {/* ---------- Right column: topbar + content ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-nav sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" aria-label={t('nav.menu')}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>{t('nav.menu')}</SheetTitle>
                </SheetHeader>
                <div className="flex h-full flex-col">{renderSidebarInner(false, () => setMobileOpen(false))}</div>
              </SheetContent>
            </Sheet>

            {/* Page title — no brand name in the topbar */}
            {title && (
              <>
                <p className="truncate text-[15px] font-semibold tracking-tight">{title}</p>
                <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-medium capitalize">
                    {kind === 'admin' ? 'Admin' : 'Learning'}
                  </span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop search trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="mr-1 hidden h-9 items-center gap-2 rounded-md border bg-background/60 px-3 text-sm text-muted-foreground outline-none transition-colors hover:border-input hover:bg-background focus-visible:ring-2 focus-visible:ring-ring md:flex"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline">{t('shell.search')}</span>
              <kbd className="ml-2 hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium lg:inline-block">
                ⌘K
              </kbd>
            </button>

            <NotificationsMenu kind={kind} />
            <LanguageSelector align="end" />
            <AnimatedThemeToggler />

            {/* Mobile avatar (desktop has the sidebar user card) */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Account"
                  >
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                        {user?.name?.slice(0, 2).toUpperCase() ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="truncate text-sm font-medium">{user?.name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => go({ name: 'learn-profile' })}>
                    <UserIcon className="h-4 w-4" /> {t('dash.profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => go({ name: 'landing' })}>
                    <Home className="h-4 w-4" /> {t('shell.viewSite')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" /> {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* ---------- Scrollable content column ---------- */}
        <main ref={mainRef} className="relative flex-1 overflow-y-auto" id="dashboard-main">
          <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Global command palette */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} kind={kind} navEntries={navEntries} />
    </div>
  )
}
