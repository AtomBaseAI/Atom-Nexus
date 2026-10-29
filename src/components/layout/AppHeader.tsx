'use client'

import { useI18n } from '@/i18n'
import { useNavStore } from '@/stores/nav-store'
import { useAuthStore } from '@/stores/auth-store'
import { LanguageSelector } from '@/components/shared/LanguageSelector'
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Atom, LayoutDashboard, LogOut, Menu, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

/** Public site header (landing, catalog, course detail). */
export function AppHeader() {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [open, setOpen] = useState(false)

  const go = (view: Parameters<typeof navigate>[0]) => {
    setOpen(false)
    navigate(view)
  }

  const handleLogout = async () => {
    await logout()
    toast.success(t('toast.logoutSuccess'))
    navigate({ name: 'landing' })
  }

  const navLinks = (
    <>
      <button onClick={() => go({ name: 'landing' })} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
        {t('nav.home')}
      </button>
      <button onClick={() => go({ name: 'catalog' })} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
        {t('nav.explore')}
      </button>
      <button onClick={() => go({ name: 'catalog', categorySlug: 'all' })} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
        {t('nav.categories')}
      </button>
    </>
  )

  const Brand = (
    <button onClick={() => go({ name: 'landing' })} className="flex items-center gap-2" aria-label={t('brand.name')}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
        <Atom className="h-4.5 w-4.5" size={18} />
      </span>
      <span className="text-[15px] font-bold tracking-tight">{t('brand.name')}</span>
    </button>
  )

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          {Brand}
          <nav className="hidden items-center gap-5 md:flex" aria-label="Main">
            {navLinks}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <LanguageSelector />
          <AnimatedThemeToggler />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => go({ name: user.role === 'ADMIN' ? 'admin' : 'learn' })}>
                  <LayoutDashboard className="h-4 w-4" /> {t('nav.dashboard')}
                </DropdownMenuItem>
                {user.role === 'ADMIN' && (
                  <DropdownMenuItem onClick={() => go({ name: 'admin' })}>
                    <ShieldCheck className="h-4 w-4" /> {t('nav.adminPanel')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4" /> {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button variant="ghost" size="sm" onClick={() => go({ name: 'login' })}>
                {t('nav.login')}
              </Button>
              <Button size="sm" className="primary-button" onClick={() => go({ name: 'register' })}>
                {t('nav.register')}
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('nav.menu')}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-left">
                  <Sparkles className="h-4 w-4 text-primary" /> {t('brand.name')}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-2 flex flex-col gap-1 px-4">
                {navLinks}
                <div className="my-3 border-t" />
                {user ? (
                  <>
                    <Button variant="outline" onClick={() => go({ name: user.role === 'ADMIN' ? 'admin' : 'learn' })}>
                      <LayoutDashboard className="h-4 w-4" /> {t('nav.dashboard')}
                    </Button>
                    <Button variant="ghost" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" /> {t('nav.logout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => go({ name: 'login' })}>
                      {t('nav.login')}
                    </Button>
                    <Button className="primary-button" onClick={() => go({ name: 'register' })}>
                      {t('nav.register')}
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
