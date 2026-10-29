'use client'

import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { api } from '@/lib/api'
import { useNavStore } from '@/stores/nav-store'
import { AppHeader } from '@/components/layout/AppHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { CourseCard, CourseGrid, type CourseCardData } from '@/components/shared/CourseCard'
import { CourseGridSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchX, Search } from 'lucide-react'

type Category = { id: string; name: string; slug: string; courseCount: number }

export function CatalogView({ initialCategory }: { initialCategory?: string }) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [category, setCategory] = useState<string>(initialCategory && initialCategory !== 'all' ? initialCategory : 'all')
  const [sort, setSort] = useState<'newest' | 'popular' | 'priceLow' | 'priceHigh'>('newest')
  const [categories, setCategories] = useState<Category[]>([])

  // Track the in-flight query key so loading is derived during render
  // (avoids synchronous setState inside the effect).
  const queryKey = `${debounced}|${category}|${sort}`
  const [result, setResult] = useState<{ key: string; courses: CourseCardData[] | null }>({
    key: queryKey,
    courses: null,
  })
  const courses = result.key === queryKey ? result.courses : null

  useEffect(() => {
    api.get<{ categories: Category[] }>('/api/categories').then((r) => setCategories(r.categories)).catch(() => undefined)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (debounced) params.set('search', debounced)
    if (category !== 'all') params.set('category', category)
    params.set('sort', sort)
    api.get<{ courses: CourseCardData[] }>(`/api/courses?${params.toString()}`)
      .then((r) => {
        if (!cancelled) setResult({ key: queryKey, courses: r.courses })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: queryKey, courses: [] })
      })
    return () => {
      cancelled = true
    }
  }, [debounced, category, sort, queryKey])

  const activeCategory = useMemo(() => categories.find((c) => c.slug === category), [categories, category])

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('catalog.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeCategory ? activeCategory.name : t('catalog.allCategories')}
        </p>

        {/* Controls */}
        <div className="glass mt-4 flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('catalog.searchPlaceholder')}
              className="pl-9"
              aria-label={t('common.search')}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('nav.categories')}>
              <button
                onClick={() => setCategory('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/70 hover:bg-primary-soft hover:text-primary'
                }`}
              >
                {t('catalog.allCategories')}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.slug)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    category === c.slug ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/70 hover:bg-primary-soft hover:text-primary'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="w-44" aria-label={t('catalog.sort')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('catalog.sortNewest')}</SelectItem>
                <SelectItem value="popular">{t('catalog.sortPopular')}</SelectItem>
                <SelectItem value="priceLow">{t('catalog.sortPriceLow')}</SelectItem>
                <SelectItem value="priceHigh">{t('catalog.sortPriceHigh')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {courses === null ? (
          <div className="mt-6">
            <CourseGridSkeleton />
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={SearchX} title={t('catalog.empty.title')} description={t('catalog.empty.desc')} />
          </div>
        ) : (
          <>
            <p className="mt-5 text-xs font-medium text-muted-foreground">{t('catalog.results', { count: courses.length })}</p>
            <div className="mt-3">
              <CourseGrid>
                {courses.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </CourseGrid>
            </div>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  )
}
