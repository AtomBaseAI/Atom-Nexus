'use client'

import { useState, type ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { useNavStore } from '@/stores/nav-store'
import { useAuthStore } from '@/stores/auth-store'
import { LanguageSelector } from '@/components/shared/LanguageSelector'
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler'
import { GlassCard } from '@/components/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Atom, Eye, EyeOff, Info } from 'lucide-react'
import { toast } from 'sonner'

function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="aurora" />
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Atom className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-bold tracking-tight">{t('brand.name')}</span>
        </button>
        <div className="flex items-center gap-1.5">
          <LanguageSelector />
          <AnimatedThemeToggler />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <GlassCard className="p-6 sm:p-8">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </GlassCard>
          {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  )
}

const demoAccounts = [
  { role: 'auth.demo.admin', email: 'admin@lms.dev', password: 'admin123' },
  { role: 'auth.demo.learner', email: 'learner@lms.dev', password: 'learner123' },
]

export function LoginView() {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const resetTo = useNavStore((s) => s.resetTo)
  const pending = useNavStore((s) => s.pending)
  const setPending = useNavStore((s) => s.setPending)
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e?: React.FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = await login(creds?.email ?? email, creds?.password ?? password)
      toast.success(t('toast.loginSuccess'))
      if (pending?.type === 'buy' && pending.slug) {
        setPending(null)
        navigate({ name: 'course', slug: pending.slug })
      } else if (user.role === 'ADMIN') {
        resetTo({ name: 'admin' })
      } else {
        resetTo({ name: 'learn' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <span>
          {t('auth.noAccount')}{' '}
          <button onClick={() => navigate({ name: 'register' })} className="font-medium text-primary hover:underline">
            {t('nav.register')}
          </button>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="primary-button w-full" disabled={busy}>
          {busy ? t('common.loading') : t('auth.login.cta')}
        </Button>
        <button type="button" onClick={() => navigate({ name: 'forgot-password' })} className="block w-full text-center text-xs text-muted-foreground hover:text-primary">
          {t('auth.forgot')}
        </button>
      </form>

      <div className="mt-6 rounded-md border border-dashed border-primary/30 bg-primary-soft/50 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Info className="h-3.5 w-3.5" /> {t('auth.demo.title')}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {demoAccounts.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setEmail(acc.email)
                setPassword(acc.password)
                submit(undefined, { email: acc.email, password: acc.password })
              }}
              className="rounded-md border bg-white/70 p-2 text-left text-[11px] leading-tight transition-colors hover:border-primary/40 dark:bg-transparent"
            >
              <span className="block font-semibold text-primary">{t(acc.role as never)}</span>
              <span className="block truncate text-muted-foreground">{acc.email}</span>
              <span className="block text-muted-foreground">{acc.password}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}

export function RegisterView() {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const resetTo = useNavStore((s) => s.resetTo)
  const register = useAuthStore((s) => s.register)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accept, setAccept] = useState(false)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError(t('auth.confirmPassword') + ' — no match')
      return
    }
    if (!accept) {
      setError(t('auth.acceptTerms'))
      return
    }
    setBusy(true)
    try {
      await register(name, email, password)
      toast.success(t('toast.registerSuccess'))
      resetTo({ name: 'learn' })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <span>
          {t('auth.hasAccount')}{' '}
          <button onClick={() => navigate({ name: 'login' })} className="font-medium text-primary hover:underline">
            {t('nav.login')}
          </button>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t('auth.name')}</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Arun Kumar" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="remail">{t('auth.email')}</Label>
          <Input id="remail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rpassword">{t('auth.password')}</Label>
            <div className="relative">
              <Input id="rpassword" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rconfirm">{t('auth.confirmPassword')}</Label>
            <Input id="rconfirm" type={show ? 'text' : 'password'} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Checkbox checked={accept} onCheckedChange={(v) => setAccept(v === true)} className="mt-0.5" />
          {t('auth.acceptTerms')}
        </label>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="primary-button w-full" disabled={busy}>
          {busy ? t('common.loading') : t('auth.register.cta')}
        </Button>
      </form>
    </AuthLayout>
  )
}

export function ForgotPasswordView() {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    // Password reset emails require a transactional provider; acknowledge intent.
    await new Promise((r) => setTimeout(r, 600))
    setSent(true)
    setBusy(false)
  }

  return (
    <AuthLayout
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.desc')}
      footer={
        <button onClick={() => navigate({ name: 'login' })} className="font-medium text-primary hover:underline">
          ← {t('nav.login')}
        </button>
      }
    >
      {sent ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {t('auth.forgot.sent')}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="femail">{t('auth.email')}</Label>
            <Input id="femail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <Button type="submit" className="primary-button w-full" disabled={busy}>
            {busy ? t('common.loading') : t('auth.forgot.cta')}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
