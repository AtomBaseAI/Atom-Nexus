'use client'

import { useState } from 'react'
import { useI18n, LOCALES } from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'
import { LearnShell } from './LearnShell'
import { GlassCard } from '@/components/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { BadgeCheck, Mail, Save, User } from 'lucide-react'

export function ProfileView() {
  const { t, locale } = useI18n()
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [name, setName] = useState(user?.name ?? '')
  const [prefLocale, setPrefLocale] = useState(user?.preferredLocale ?? locale)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  const save = async () => {
    setBusy(true)
    try {
      await updateProfile({ name, preferredLocale: prefLocale })
      toast.success(t('profile.saved'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <LearnShell title={t('profile.title')}>
      <h1 className="text-2xl font-bold tracking-tight">{t('profile.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('profile.subtitle')}</p>

      <div className="mt-5 max-w-xl">
        <GlassCard className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-base font-semibold text-primary">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="flex items-center gap-1 font-semibold">
                {user.name} <BadgeCheck className="h-4 w-4 text-primary" />
              </p>
              <p className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pname" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> {t('profile.name')}
            </Label>
            <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {t('profile.email')}
            </Label>
            <Input value={user.email} disabled />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plocale">{t('profile.locale')}</Label>
            <Select value={prefLocale} onValueChange={setPrefLocale}>
              <SelectTrigger id="plocale" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.native}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('profile.localeHint')}</p>
          </div>

          <Button className="primary-button" onClick={save} disabled={busy}>
            <Save className="mr-1.5 h-4 w-4" />
            {busy ? t('common.saving') : t('profile.save')}
          </Button>
        </GlassCard>
      </div>
    </LearnShell>
  )
}
