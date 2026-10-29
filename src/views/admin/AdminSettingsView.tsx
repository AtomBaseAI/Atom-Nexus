'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { AdminShell } from './AdminShell'
import { GlassCard } from '@/components/shared/GlassCard'
import { ListSkeleton } from '@/components/shared/LoadingSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plug, Save } from 'lucide-react'

type Settings = {
  platformName: string
  defaultLocale: string
  supportedLocales: string | string[]
  refundPolicy: string
  supportEmail: string
}

type Integrations = { payments?: string; video?: string; note?: string }

const asText = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(', ') : (v ?? ''))

function IntegrationBadge({ mode, label }: { mode: string | undefined; label: string }) {
  const live = mode === 'live'
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Badge
        className={`border-0 ${
          live
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
        }`}
      >
        {live ? 'Connected' : 'Demo mode'}
      </Badge>
    </div>
  )
}

export function AdminSettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [integrations, setIntegrations] = useState<Integrations>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get<{ settings: Settings; integrations?: Integrations }>('/api/admin/settings')
      .then((r) => {
        setSettings({
          platformName: r.settings.platformName ?? '',
          defaultLocale: r.settings.defaultLocale ?? 'en',
          supportedLocales: asText(r.settings.supportedLocales),
          refundPolicy: r.settings.refundPolicy ?? '',
          supportEmail: r.settings.supportEmail ?? '',
        })
        setIntegrations(r.integrations ?? {})
      })
      .catch((err: Error) => toast.error(err.message))
  }, [])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await api.patch('/api/admin/settings', {
        platformName: settings.platformName,
        defaultLocale: settings.defaultLocale,
        supportedLocales: settings.supportedLocales,
        refundPolicy: settings.refundPolicy,
        supportEmail: settings.supportEmail,
      })
      toast.success('Saved')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return (
      <AdminShell title="Settings">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <GlassCard className="mt-5 p-5">
          <ListSkeleton rows={5} />
        </GlassCard>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Settings">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Platform configuration and integrations.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <GlassCard className="space-y-4 p-5 xl:col-span-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Platform name</Label>
            <Input
              id="s-name"
              value={settings.platformName}
              onChange={(e) => set('platformName', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Default locale</Label>
              <Select value={settings.defaultLocale} onValueChange={(v) => set('defaultLocale', v)}>
                <SelectTrigger aria-label="Default locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ta">Tamil</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-locales">Supported locales</Label>
              <Input
                id="s-locales"
                value={settings.supportedLocales}
                onChange={(e) => set('supportedLocales', e.target.value)}
                placeholder="en, ta, hi"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-refund">Refund policy</Label>
            <Textarea
              id="s-refund"
              rows={5}
              value={settings.refundPolicy}
              onChange={(e) => set('refundPolicy', e.target.value)}
              placeholder="Describe when learners can request refunds…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">Support email</Label>
            <Input
              id="s-email"
              type="email"
              value={settings.supportEmail}
              onChange={(e) => set('supportEmail', e.target.value)}
              placeholder="support@example.com"
            />
          </div>
          <Button className="primary-button" onClick={save} disabled={saving}>
            <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </GlassCard>

        <GlassCard className="h-fit space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Plug className="h-4 w-4 text-primary" /> Integrations
          </h2>
          <div className="space-y-3">
            <IntegrationBadge mode={integrations.payments} label="Payments (Razorpay)" />
            <IntegrationBadge mode={integrations.video} label="Video (Mux)" />
          </div>
          {integrations.note && (
            <p className="rounded-md bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
              {integrations.note}
            </p>
          )}
        </GlassCard>
      </div>
    </AdminShell>
  )
}
