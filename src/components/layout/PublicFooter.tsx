'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { useNavStore } from '@/stores/nav-store'
import { Atom, Instagram, Linkedin, Mail, Send, Twitter, Youtube } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type PublicSettings = {
  platformName: string
  refundPolicy: string
  supportEmail: string
}

/** Sticky public footer — mt-auto inside the min-h-screen flex column. */
export function PublicFooter() {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    api.get<{ settings: PublicSettings }>('/api/settings').then((r) => setSettings(r.settings)).catch(() => undefined)
  }, [])

  const goPolicy = (slug: string) => navigate({ name: 'policy', slug })

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setEmail('')
    toast.success(t('toast.subscribed'))
  }

  const socials = [
    { icon: Twitter, label: 'Twitter / X' },
    { icon: Youtube, label: 'YouTube' },
    { icon: Linkedin, label: 'LinkedIn' },
    { icon: Instagram, label: 'Instagram' },
  ]

  const columns: { title: string; items: { label: string; onClick?: () => void; href?: string }[] }[] = [
    {
      title: t('footer.explore'),
      items: [
        { label: t('landing.viewAll'), onClick: () => navigate({ name: 'catalog' }) },
        { label: t('nav.categories'), onClick: () => navigate({ name: 'catalog', categorySlug: 'all' }) },
        { label: t('landing.featured'), onClick: () => navigate({ name: 'catalog' }) },
      ],
    },
    {
      title: t('footer.support'),
      items: [
        { label: t('footer.helpCenter'), onClick: () => navigate({ name: 'landing' }) },
        { label: t('footer.faqs'), onClick: () => navigate({ name: 'landing' }) },
        { label: settings?.supportEmail || 'support@atomnexus.io', href: `mailto:${settings?.supportEmail || 'support@atomnexus.io'}` },
      ],
    },
    {
      title: t('footer.policies'),
      items: [
        { label: t('footer.cancellation'), onClick: () => goPolicy('cancellation-policy') },
        { label: t('footer.refund'), onClick: () => goPolicy('refund-policy') },
        { label: t('footer.privacy'), onClick: () => goPolicy('privacy-policy') },
        { label: t('footer.terms'), onClick: () => goPolicy('terms-of-service') },
        { label: t('footer.cookies'), onClick: () => goPolicy('cookie-policy') },
      ],
    },
    {
      title: t('footer.contact'),
      items: [
        { label: settings?.supportEmail || 'support@atomnexus.io', href: `mailto:${settings?.supportEmail || 'support@atomnexus.io'}` },
      ],
    },
  ]

  return (
    <footer className="mt-auto border-t bg-white/60 backdrop-blur-sm dark:bg-white/[0.03]">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2.6fr]">
          {/* Brand + newsletter */}
          <div className="max-w-sm">
            <button
              onClick={() => navigate({ name: 'landing' })}
              className="flex items-center gap-2"
              aria-label={t('brand.name')}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-[#a45cff] text-primary-foreground shadow-sm">
                <Atom className="h-4.5 w-4.5" size={18} />
              </span>
              <span className="text-[15px] font-bold tracking-tight">
                {settings?.platformName ?? t('brand.name')}
              </span>
            </button>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              {t('landing.footer.tagline')}
            </p>

            {/* Socials */}
            <div className="mt-4 flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>

            {/* Newsletter */}
            <div className="mt-6">
              <p className="text-sm font-semibold">{t('footer.newsletter.title')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('footer.newsletter.desc')}</p>
              <form onSubmit={subscribe} className="mt-2.5 flex max-w-xs items-center gap-2" role="form">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer.newsletter.placeholder')}
                  aria-label={t('footer.newsletter.placeholder')}
                  className="h-9 rounded-md text-sm"
                />
                <Button type="submit" size="sm" className="primary-button h-9 shrink-0 px-3">
                  <Send className="h-3.5 w-3.5" />
                  <span className="sr-only">{t('footer.subscribe')}</span>
                </Button>
              </form>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title} className="space-y-2.5">
                <p className="font-semibold">{col.title}</p>
                {col.items.map((item) =>
                  item.href ? (
                    <a
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-1.5 break-all text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label === (settings?.supportEmail || 'support@atomnexus.io') && (
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {item.label}
                    </a>
                  ) : (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className="block text-left text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                    </button>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {settings?.platformName ?? t('brand.name')}.{' '}
            {t('landing.footer.rights')}
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button onClick={() => goPolicy('terms-of-service')} className="transition-colors hover:text-primary">
              {t('footer.terms')}
            </button>
            <button onClick={() => goPolicy('privacy-policy')} className="transition-colors hover:text-primary">
              {t('footer.privacy')}
            </button>
            <button onClick={() => goPolicy('cookie-policy')} className="transition-colors hover:text-primary">
              {t('footer.cookies')}
            </button>
          </span>
        </div>
      </div>
    </footer>
  )
}
