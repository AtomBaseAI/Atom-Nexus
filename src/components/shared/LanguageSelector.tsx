'use client'

import { useI18n, LOCALES } from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Languages, Check } from 'lucide-react'

/**
 * Interface-locale selector. Independent from the video audio language.
 * Persists to localStorage and to the user profile when logged in.
 */
export function LanguageSelector({ align = 'end', compact = false }: { align?: 'start' | 'end'; compact?: boolean }) {
  const { t, locale, setLocale } = useI18n()
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  const change = (code: (typeof LOCALES)[number]['code']) => {
    setLocale(code)
    if (user) {
      updateProfile({ preferredLocale: code }).catch(() => undefined)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" aria-label={t('nav.language')}>
          <Languages className="h-4 w-4" />
          {!compact && <span className="text-sm">{LOCALES.find((l) => l.code === locale)?.native}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-40">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t('nav.language')}</DropdownMenuLabel>
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => change(l.code)} className="justify-between">
            <span>{l.native}</span>
            {locale === l.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
