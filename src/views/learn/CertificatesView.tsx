'use client'

import { useI18n } from '@/i18n'
import { LearnShell } from './LearnShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { Award, Sparkles } from 'lucide-react'

export function CertificatesView() {
  const { t } = useI18n()
  return (
    <LearnShell title={t('certificates.title')}>
      <h1 className="text-2xl font-bold tracking-tight">{t('certificates.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('certificates.subtitle')}</p>

      <div className="mt-5">
        <EmptyState
          icon={Award}
          title={t('certificates.empty.title')}
          description={t('certificates.empty.desc')}
          action={
            <p className="flex items-center gap-1.5 rounded-md border border-dashed border-primary/30 bg-primary-soft/60 px-3 py-2 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {t('certificates.comingSoon')}
            </p>
          }
        />
      </div>
    </LearnShell>
  )
}
