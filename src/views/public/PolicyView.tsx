'use client'

import { useI18n } from '@/i18n'
import { useNavStore } from '@/stores/nav-store'
import { AppHeader } from '@/components/layout/AppHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { Reveal } from '@/components/magicui/reveal'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail } from 'lucide-react'
import { api } from '@/lib/api'
import { useEffect, useState } from 'react'

/* ------------------------------------------------------------------ */
/* Policy content                                                      */
/* ------------------------------------------------------------------ */

export type PolicySlug =
  | 'cancellation-policy'
  | 'refund-policy'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'cookie-policy'

type Policy = {
  title: string
  updated: string
  intro: string
  sections: { heading: string; body: string[] }[]
}

export const POLICY_SLUGS: PolicySlug[] = [
  'cancellation-policy',
  'refund-policy',
  'privacy-policy',
  'terms-of-service',
  'cookie-policy',
]

const POLICIES: Record<PolicySlug, Policy> = {
  'cancellation-policy': {
    title: 'Cancellation Policy',
    updated: 'January 2025',
    intro:
      'This policy explains how cancellations work for course purchases, cohort enrollments and subscriptions on Atom Nexus.',
    sections: [
      {
        heading: '1. Cancelling before access is granted',
        body: [
          'You may cancel an order at any time before your payment has been verified and course access has been granted. To cancel, contact our support team with your order ID.',
          'Cancelled orders that have not been verified are released immediately and no charge is captured. If a payment was already captured, the order is treated as a refund under our Refund Policy.',
        ],
      },
      {
        heading: '2. Cancelling a live cohort enrollment',
        body: [
          'For scheduled live cohorts, you may cancel your seat up to 48 hours before the cohort start time and request a full refund or a free transfer to a later cohort.',
          'Cancellations requested within 48 hours of the cohort start are not eligible for a refund, but may be transferred once to the next available cohort at our discretion.',
        ],
      },
      {
        heading: '3. Auto-cancellation of pending payments',
        body: [
          'Orders left in a pending state — for example an unfinished payment session — are cancelled automatically after 24 hours. No charge is made for auto-cancelled orders.',
          'If you believe a cancelled order was charged in error, contact support@atomnexus.io within 7 days and we will investigate with our payment partner.',
        ],
      },
      {
        heading: '4. How to request a cancellation',
        body: [
          'Email support@atomnexus.io from your registered address with the subject "Cancellation" and include your order ID. We respond within 1–2 business days.',
        ],
      },
    ],
  },
  'refund-policy': {
    title: 'Refund Policy',
    updated: 'January 2025',
    intro:
      'We want every learner to be confident in their purchase. This policy describes when and how refunds are issued on Atom Nexus.',
    sections: [
      {
        heading: '1. 14-day money-back guarantee',
        body: [
          'You may request a full refund within 14 days of purchase, provided you have completed less than 30% of the course content. This applies to all paid, self-paced courses.',
          'Refund requests after 14 days, or for courses where more than 30% of content has been completed, are evaluated case by case and are not guaranteed.',
        ],
      },
      {
        heading: '2. Processing and timelines',
        body: [
          'Approved refunds are processed through our payment partner Razorpay and typically reflect in your original payment method within 5–7 business days, depending on your bank.',
          'You will receive an email confirmation once your refund has been initiated, including a reference number you can quote to support.',
        ],
      },
      {
        heading: '3. Non-refundable cases',
        body: [
          'Courses for which a completion certificate has already been issued are not eligible for refunds.',
          'Abuse of the refund guarantee — for example repeated purchase-and-refund cycles — may lead to refund denial and, in serious cases, account suspension.',
        ],
      },
      {
        heading: '4. How to request a refund',
        body: [
          'Email support@atomnexus.io from your registered address with the subject "Refund request" and your order ID. Our team reviews and responds within 1–2 business days.',
        ],
      },
    ],
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    updated: 'January 2025',
    intro:
      'Your privacy matters. This policy explains what data Atom Nexus collects, why we collect it, and the choices you have.',
    sections: [
      {
        heading: '1. Data we collect',
        body: [
          'Account data: your name, email address and hashed password when you register.',
          'Learning data: courses enrolled, lessons watched, playback position, quiz results and certificates earned.',
          'Payment data: handled entirely by our payment partner Razorpay. We never see or store your full card details — we only store the order status and receipt reference.',
        ],
      },
      {
        heading: '2. How we use your data',
        body: [
          'To provide the service: deliver course access, remember your progress and resume lessons across devices.',
          'To improve the platform: aggregated, anonymised usage analytics help us understand which lessons and features work best.',
          'To communicate with you: transactional emails (receipts, refunds) and — only with your consent — occasional product updates. You can unsubscribe at any time.',
        ],
      },
      {
        heading: '3. Cookies and local storage',
        body: [
          'We use a small number of cookies and browser local-storage entries to keep you signed in, remember your theme and language preferences, and store your session view. See our Cookie Policy for details.',
        ],
      },
      {
        heading: '4. Sharing and third parties',
        body: [
          'We do not sell your personal data. We share the minimum data necessary with the service providers that power the platform: payment processing (Razorpay) and video delivery. Each processes data only on our instructions.',
        ],
      },
      {
        heading: '5. Your rights and retention',
        body: [
          'You may request a copy of your data or ask us to delete your account at any time by emailing support@atomnexus.io. We retain learning records only as long as your account is active, plus any period required by tax and accounting law for payment records.',
        ],
      },
    ],
  },
  'terms-of-service': {
    title: 'Terms of Service',
    updated: 'January 2025',
    intro:
      'These terms govern your use of the Atom Nexus learning platform. By creating an account or purchasing a course you agree to them.',
    sections: [
      {
        heading: '1. Accounts',
        body: [
          'You agree to provide accurate registration information and to keep your password confidential. You are responsible for all activity that happens under your account.',
          'One account per learner. Sharing a single account between multiple people is not permitted and may result in suspension.',
        ],
      },
      {
        heading: '2. Course access and license',
        body: [
          'Purchasing a course grants you a personal, non-transferable, lifetime license to access its content for your own learning. You may not download, record, redistribute, resell or publicly display course videos or materials.',
          'We may update or improve course content over time. If a course is retired, enrolled learners retain access to any available archive version.',
        ],
      },
      {
        heading: '3. Acceptable use',
        body: [
          'Do not attempt to disrupt the platform, scrape content, bypass payment, or access lessons you have not enrolled in. Violations may lead to immediate termination without refund.',
        ],
      },
      {
        heading: '4. Payments and taxes',
        body: [
          'Prices are shown in your selected currency and may include applicable taxes depending on your region. Payments are processed by Razorpay; we never store your card details.',
        ],
      },
      {
        heading: '5. Intellectual property and liability',
        body: [
          'All course content, branding and platform software are the property of Atom Nexus or its instructors and are protected by copyright.',
          'The platform is provided "as is". To the maximum extent permitted by law, Atom Nexus is not liable for indirect or consequential damages arising from your use of the platform.',
        ],
      },
      {
        heading: '6. Changes to these terms',
        body: [
          'We may update these terms as the platform evolves. Material changes are announced in-product or by email. Continued use after an update constitutes acceptance.',
        ],
      },
    ],
  },
  'cookie-policy': {
    title: 'Cookie Policy',
    updated: 'January 2025',
    intro:
      'Atom Nexus uses a minimal set of cookies and browser storage to keep the platform fast, secure and personalised.',
    sections: [
      {
        heading: '1. What we store',
        body: [
          'Essential storage: a session token so you stay signed in securely. Without it, login and course access cannot function.',
          'Preferences: your chosen interface language (English, Tamil or Hindi) and light/dark theme, stored locally so the platform opens exactly how you left it.',
          'Session view: the page you were last on, so a refresh brings you back instead of resetting to the home page.',
        ],
      },
      {
        heading: '2. What we do not do',
        body: [
          'We do not run third-party advertising cookies, cross-site trackers or data-broker pixels. Nothing we store is shared with advertisers.',
        ],
      },
      {
        heading: '3. Managing cookies',
        body: [
          'You can clear cookies and local storage at any time from your browser settings — you will simply be signed out and preferences reset. Blocking essential storage will prevent login from working.',
        ],
      },
    ],
  },
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export function PolicyView({ slug }: { slug: string }) {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const [supportEmail, setSupportEmail] = useState('support@atomnexus.io')

  useEffect(() => {
    api
      .get<{ settings: { supportEmail: string } }>('/api/settings')
      .then((r) => {
        if (r.settings.supportEmail) setSupportEmail(r.settings.supportEmail)
      })
      .catch(() => undefined)
  }, [])

  const policy = POLICIES[slug as PolicySlug] ?? POLICIES['terms-of-service']

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="relative flex-1">
        <div className="aurora" />
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <Reveal>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ name: 'landing' })}
              className="-ml-2 mb-6 text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> {t('policy.back')}
            </Button>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{policy.title}</h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t('policy.lastUpdated')}: {policy.updated}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{policy.intro}</p>

            <div className="mt-8 space-y-7">
              {policy.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-base font-semibold">{section.heading}</h2>
                  <div className="mt-2 space-y-2.5">
                    {section.body.map((para, i) => (
                      <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                        {para}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="glass mt-10 flex flex-col items-start gap-3 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{t('policy.contactTitle')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{policy.title}</p>
              </div>
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary-soft px-4 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Mail className="h-4 w-4" /> {t('policy.contactCta')}
              </a>
            </div>
          </Reveal>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
