'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { api } from '@/lib/api'
import { useNavStore } from '@/stores/nav-store'
import { AppHeader } from '@/components/layout/AppHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { CourseCard, CourseGrid, type CourseCardData } from '@/components/shared/CourseCard'
import { CourseGridSkeleton } from '@/components/shared/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Marquee } from '@/components/magicui/marquee'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { AnimatedGradientText } from '@/components/magicui/animated-gradient-text'
import { WordRotate } from '@/components/magicui/word-rotate'
import { Reveal } from '@/components/magicui/reveal'
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Cloud,
  Clock3,
  Code2,
  Compass,
  Globe,
  Languages,
  MonitorSmartphone,
  Palette,
  PlayCircle,
  Radio,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'

type Category = { id: string; name: string; slug: string; courseCount: number }

/* ------------------------------------------------------------------ */
/* Static marketing data                                               */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'web-development': Code2,
  programming: Code2,
  'data-engineering': BarChart3,
  'cloud-computing': Cloud,
  business: Briefcase,
  design: Palette,
}

const LOGOS = [
  'Google',
  'Microsoft',
  'Amazon',
  'TCS',
  'Infosys',
  'Zoho',
  'Flipkart',
  'Wipro',
  'Freshworks',
  'Paytm',
  'Swiggy',
  'Accenture',
]

const TESTIMONIALS = [
  {
    name: 'Priya Raghavan',
    role: 'Frontend Developer · Chennai',
    initials: 'PR',
    quote:
      'Switching lessons to Tamil whenever I struggled made everything click. I landed my first developer job in 4 months.',
  },
  {
    name: 'Arjun Mehta',
    role: 'Data Analyst · Bengaluru',
    initials: 'AM',
    quote:
      'The progress tracking kept me honest — 20 minutes a day and I finished the entire data engineering track.',
  },
  {
    name: 'Sneha Kulkarni',
    role: 'Product Designer · Pune',
    initials: 'SK',
    quote:
      'Bite-sized lessons that respect your time. I studied on the metro every morning and earned my certificate in weeks.',
  },
  {
    name: 'Karthik Subramanian',
    role: 'Cloud Engineer · Coimbatore',
    initials: 'KS',
    quote:
      'The instructors actually work in the industry. Every example felt like something I would build on the job.',
  },
  {
    name: 'Ananya Iyer',
    role: 'Full-stack Developer · Madurai',
    initials: 'AI',
    quote:
      'I compared three platforms before choosing Atom Nexus — the multilingual player and lifetime access sealed it.',
  },
  {
    name: 'Rahul Verma',
    role: 'Engineering Manager · Delhi',
    initials: 'RV',
    quote:
      'We onboarded our whole team on Atom Nexus. The weekly goal streaks turned learning into a friendly competition.',
  },
  {
    name: 'Divya Nair',
    role: 'Business Analyst · Kochi',
    initials: 'DN',
    quote:
      'Clean videos, real projects and a certificate I could actually show. Worth every rupee.',
  },
  {
    name: 'Mohammed Ali',
    role: 'Student · Hyderabad',
    initials: 'MA',
    quote:
      'The free preview lessons helped me pick the right course. No guesswork, no wasted money.',
  },
]

/* ------------------------------------------------------------------ */
/* Landing view                                                        */
/* ------------------------------------------------------------------ */

export function LandingView() {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const [featured, setFeatured] = useState<CourseCardData[] | null>(null)
  const [popular, setPopular] = useState<CourseCardData[] | null>(null)
  const [recent, setRecent] = useState<CourseCardData[] | null>(null)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [totalCourses, setTotalCourses] = useState(0)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api
      .get<{ courses: CourseCardData[] }>('/api/courses')
      .then((r) => {
        setTotalCourses(r.courses.length)
        setFeatured(r.courses.filter((c) => c.featured).slice(0, 4))
        setPopular([...r.courses].sort((a, b) => b.stats.learners - a.stats.learners).slice(0, 4))
        setRecent(
          [...r.courses]
            .sort((a, b) => +new Date(b.publishedAt ?? 0) - +new Date(a.publishedAt ?? 0))
            .slice(0, 4),
        )
      })
      .catch(() => {
        setFeatured([])
        setPopular([])
        setRecent([])
      })
    api
      .get<{ categories: Category[] }>('/api/categories')
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]))
  }, [])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate({ name: 'catalog', q: query.trim() || undefined })
  }

  const scrollToHow = () => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        {/* ============================ HERO (plain) ============================ */}
        <section className="relative overflow-x-clip bg-gradient-to-b from-primary-soft/60 via-background to-background">
          <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:pb-24 lg:pt-20">
            {/* Copy */}
            <Reveal>
              <AnimatedGradientText icon={<Sparkles className="h-3.5 w-3.5" />}>
                {t('hero.badge')}
              </AnimatedGradientText>

              <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                {t('hero.titleA')}
                <br />
                <span className="text-gradient">
                  <WordRotate
                    words={[
                      t('hero.rotate.1' as never),
                      t('hero.rotate.2' as never),
                      t('hero.rotate.3' as never),
                    ]}
                  />
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                {t('hero.subtitleV2')}
              </p>

              {/* Search-first hero (Coursera pattern) */}
              <form
                onSubmit={submitSearch}
                className="glass mt-7 flex w-full max-w-xl items-center gap-2 rounded-full p-1.5 pl-4"
                role="search"
              >
                <Search className="h-4.5 w-4.5 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('hero.searchPlaceholder')}
                  aria-label={t('hero.searchPlaceholder')}
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button type="submit" className="primary-button shrink-0 rounded-full px-5">
                  {t('hero.searchCta')}
                </Button>
              </form>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate({ name: 'catalog' })}
                  className="primary-button px-6"
                >
                  {t('hero.ctaPrimary')} <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-card"
                  onClick={scrollToHow}
                >
                  <PlayCircle className="h-4.5 w-4.5" /> {t('how.title')}
                </Button>
              </div>

              {/* Social proof */}
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <div className="flex -space-x-2" aria-hidden>
                  {TESTIMONIALS.slice(0, 5).map((p) => (
                    <span
                      key={p.initials}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary-soft text-[10px] font-bold text-primary"
                    >
                      {p.initials}
                    </span>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ml-1.5 text-xs font-semibold">4.8/5</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('hero.joinLearners')}</p>
                </div>
              </div>
            </Reveal>

            {/* Visual */}
            <Reveal delay={0.12} className="relative">
              <div className="relative overflow-hidden rounded-xl border bg-card p-1.5 shadow-xl shadow-primary/5">
                <img
                  src="/images/hero-nexus.png"
                  alt={t('brand.name')}
                  className="w-full rounded-lg object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = '1'
                      img.src = '/images/hero.png'
                    }
                  }}
                />
              </div>

              {/* Floating chips */}
              <div
                className="absolute -left-2 top-10 hidden animate-float items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-lg sm:flex lg:-left-6"
                style={{ animationDelay: '0.4s' }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Radio className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold">{t('hero.floatLive')}</span>
              </div>
              <div
                className="absolute -bottom-5 right-6 hidden animate-float items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-lg sm:flex"
                style={{ animationDelay: '1.4s' }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold">{t('hero.floatCert')}</span>
              </div>
              <div
                className="absolute -right-2 top-24 hidden animate-float items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-lg lg:flex"
                style={{ animationDelay: '2.2s' }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <TrendingUp className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold">{t('hero.floatProgress')}</span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============================ STATS BAND (plain) ============================ */}
        <section className="border-y bg-muted/40">
          <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-4 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
            {(
              [
                { icon: Users, value: 12400, suffix: '+', label: t('stats.learners') },
                { icon: BookOpen, value: Math.max(totalCourses, 8), suffix: '+', label: t('stats.courses') },
                { icon: Clock3, value: 260, suffix: '+', label: t('stats.hours') },
                { icon: Languages, value: 3, suffix: '', label: t('stats.languages') },
              ] as const
            ).map((s) => (
              <div key={s.label} className="flex items-center gap-3.5">
                <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary sm:flex">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                    <NumberTicker value={s.value} />
                    {s.suffix}
                  </p>
                  <p className="text-xs text-muted-foreground sm:text-sm">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================ TRUST MARQUEE ============================ */}
        <section className="py-10 sm:py-12" aria-label={t('trust.title')}>
          <Reveal>
            <p className="text-center text-sm font-medium text-muted-foreground">
              {t('trust.title')}
            </p>
            <Marquee
              className="mt-6 [mask-image:linear-gradient(to_right,transparent,#000_14%,#000_86%,transparent)]"
              duration="34s"
              gap="3.5rem"
              pause
            >
              {LOGOS.map((logo) => (
                <span
                  key={logo}
                  className="select-none whitespace-nowrap text-lg font-bold tracking-tight text-muted-foreground/55 transition-colors hover:text-foreground sm:text-xl"
                >
                  {logo}
                </span>
              ))}
            </Marquee>
          </Reveal>
        </section>

        {/* ============================ CATEGORIES ============================ */}
        <Section title={t('landing.categories')} subtitle={t('landing.categoriesSub')}>
          {categories === null ? (
            <CourseGridSkeleton count={5} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.slug] ?? Globe
                return (
                  <div
                    key={cat.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate({ name: 'catalog', categorySlug: cat.slug })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') navigate({ name: 'catalog', categorySlug: cat.slug })
                    }}
                    className="cursor-pointer rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <Icon className="h-4.5 w-4.5" size={18} />
                    </span>
                    <p className="mt-3 text-sm font-semibold leading-tight">{cat.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {cat.courseCount} {t('course.lessons') === 'lessons' ? 'courses' : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* ============================ FEATURED ============================ */}
        <Section
          title={t('landing.featured')}
          subtitle={t('landing.featuredSub')}
          onMore={() => navigate({ name: 'catalog' })}
          moreLabel={t('landing.viewAll')}
        >
          {featured === null ? (
            <CourseGridSkeleton />
          ) : featured.length > 0 ? (
            <CourseGrid>
              {featured.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </CourseGrid>
          ) : null}
        </Section>

        {/* ============================ WHY — BENTO ============================ */}
        <Section title={t('landing.why')} subtitle={t('landing.whySub')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-card p-6 sm:col-span-2">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Languages className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{t('why.multilingual.title')}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t('why.multilingual.desc')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                  {['English', 'தமிழ்', 'हिन्दी'].map((lang) => (
                    <span
                      key={lang}
                      className="rounded-full border border-primary/15 bg-primary-soft/60 px-3 py-1 text-xs font-semibold text-primary"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {(
              [
                {
                  icon: TrendingUp,
                  title: t('why.progress.title'),
                  desc: t('why.progress.desc'),
                },
                {
                  icon: Award,
                  title: t('why.certificate.title'),
                  desc: t('why.certificate.desc'),
                },
                {
                  icon: Compass,
                  title: t('why.mentors.title'),
                  desc: t('why.mentors.desc'),
                },
                {
                  icon: MonitorSmartphone,
                  title: t('why.lifetime.title'),
                  desc: t('why.lifetime.desc'),
                },
              ] as const
            ).map((card) => (
              <div key={card.title} className="rounded-lg border bg-card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <card.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{card.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ============================ HOW IT WORKS ============================ */}
        <section id="how" className="mx-auto max-w-[1440px] scroll-mt-20 px-4 py-10 sm:px-6">
          <SectionHeading
            title={t('how.title')}
            subtitle={t('how.subtitle')}
            centered
          />
          <Reveal>
            <div className="relative mt-8 grid gap-4 md:grid-cols-3">
              {/* connector */}
              <div
                className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden border-t-2 border-dashed border-primary/25 md:block"
                aria-hidden
              />
              {(
                [
                  { icon: Compass, title: t('how.step1.title'), desc: t('how.step1.desc') },
                  { icon: PlayCircle, title: t('how.step2.title'), desc: t('how.step2.desc') },
                  { icon: Award, title: t('how.step3.title'), desc: t('how.step3.desc') },
                ] as const
              ).map((step, i) => (
                <div key={step.title} className="rounded-lg border bg-card p-6 text-center">
                  <div className="relative mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-primary-soft" aria-hidden />
                    <step.icon className="relative h-7 w-7 text-primary" />
                    <span className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-md shadow-primary/30">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ============================ POPULAR ============================ */}
        <Section
          title={t('landing.popular')}
          subtitle={t('landing.popularSub')}
          onMore={() => navigate({ name: 'catalog' })}
          moreLabel={t('landing.viewAll')}
        >
          {popular === null ? (
            <CourseGridSkeleton />
          ) : popular.length > 0 ? (
            <CourseGrid>
              {popular.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </CourseGrid>
          ) : null}
        </Section>

        {/* ============================ TESTIMONIALS ============================ */}
        <section className="py-10 sm:py-12" aria-label={t('landing.testimonials')}>
          <SectionHeading title={t('landing.testimonials')} subtitle={t('landing.testimonialsSub')} centered />
          <Reveal>
            <Marquee
              className="mt-8 [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]"
              duration="58s"
              gap="1rem"
              pause
            >
              {TESTIMONIALS.map((p) => (
                <TestimonialCard key={p.name} {...p} />
              ))}
            </Marquee>
            <Marquee
              reverse
              className="mt-4 [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]"
              duration="66s"
              gap="1rem"
              pause
            >
              {[...TESTIMONIALS].reverse().map((p) => (
                <TestimonialCard key={p.name} {...p} />
              ))}
            </Marquee>
          </Reveal>
        </section>

        {/* ============================ RECENTLY ADDED ============================ */}
        <Section
          title={t('landing.recent')}
          subtitle={t('landing.recentSub')}
          onMore={() => navigate({ name: 'catalog' })}
          moreLabel={t('landing.viewAll')}
        >
          {recent === null ? (
            <CourseGridSkeleton />
          ) : recent.length > 0 ? (
            <CourseGrid>
              {recent.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </CourseGrid>
          ) : null}
        </Section>

        {/* ============================ FAQ ============================ */}
        <Section title={t('landing.faq')} subtitle="">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="glass rounded-lg px-4">
                {[1, 2, 3, 4].map((i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-sm font-semibold">
                      {t(`landing.faq${i}.q` as never)}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {t(`landing.faq${i}.a` as never)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Reveal>
        </Section>

        {/* ============================ CTA BAND (plain) ============================ */}
        <section className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6">
          <Reveal>
            <div className="rounded-xl bg-gradient-to-br from-primary to-[#a45cff] p-8 text-center text-white shadow-xl shadow-primary/20 sm:p-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t('cta.band.title')}
              </h2>
              <p className="mx-auto mt-2.5 max-w-xl text-sm leading-relaxed text-white/85">
                {t('cta.band.sub')}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  className="h-12 bg-white px-8 text-base font-semibold text-primary hover:bg-white/90"
                  onClick={() => navigate({ name: 'register' })}
                >
                  {t('cta.band.button')} <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/40 bg-white/10 px-7 text-white hover:bg-white/20 hover:text-white"
                  onClick={() => navigate({ name: 'catalog' })}
                >
                  {t('hero.ctaPrimary')}
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section helpers                                                     */
/* ------------------------------------------------------------------ */

function SectionHeading({
  title,
  subtitle,
  centered = false,
}: {
  title: string
  subtitle?: string
  centered?: boolean
}) {
  return (
    <Reveal>
      <div className={centered ? 'text-center' : 'flex items-end justify-between gap-3'}>
        <div className={centered ? 'mx-auto max-w-2xl' : ''}>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </Reveal>
  )
}

function Section({
  title,
  subtitle,
  children,
  onMore,
  moreLabel,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  onMore?: () => void
  moreLabel?: string
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5 flex items-end justify-between gap-3">
        <SectionHeading title={title} subtitle={subtitle || undefined} />
        {onMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMore}
            className="shrink-0 text-primary hover:bg-primary-soft hover:text-primary"
          >
            {moreLabel} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {children}
    </section>
  )
}

function TestimonialCard({
  name,
  role,
  initials,
  quote,
}: {
  name: string
  role: string
  initials: string
  quote: string
}) {
  return (
    <figure className="w-[320px] shrink-0 rounded-lg border bg-card p-5 transition-shadow hover:shadow-md sm:w-[360px]">
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <blockquote className="mt-3 text-sm leading-relaxed text-foreground/90">“{quote}”</blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
          {initials}
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </figcaption>
    </figure>
  )
}
