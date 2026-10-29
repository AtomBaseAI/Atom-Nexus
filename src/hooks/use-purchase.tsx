'use client'

import { useCallback, useState } from 'react'
import { useI18n } from '@/i18n'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useNavStore } from '@/stores/nav-store'
import { toast } from 'sonner'
import { CheckoutModal, type CheckoutSession } from '@/components/payments/CheckoutModal'

/**
 * Buy/enroll orchestration used by the course detail page.
 * Handles: login redirect, free enroll, paid checkout (demo + live).
 */
export function usePurchase() {
  const { t } = useI18n()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavStore((s) => s.navigate)
  const setPending = useNavStore((s) => s.setPending)
  const [session, setSession] = useState<CheckoutSession | null>(null)

  const requireLogin = useCallback(() => {
    toast.info(t('toast.needLogin'))
    setPending({ type: 'buy', slug: '' })
    navigate({ name: 'login' })
  }, [navigate, setPending, t])

  const startPurchase = useCallback(
    async (course: { id: string; slug: string; title: string; isFree: boolean }) => {
      if (!user) {
        requireLogin()
        return
      }
      if (course.isFree) {
        try {
          await api.post(`/api/learn/courses/${course.id}/enroll-free`)
          toast.success(t('toast.enrolled'))
          navigate({ name: 'player', courseId: course.id })
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('common.error'))
        }
        return
      }
      try {
        const res = await api.post<CheckoutSession>('/api/payments/create-order', { courseId: course.id })
        setSession(res)
      } catch (err) {
        const message = err instanceof Error ? err.message : t('common.error')
        if (message.includes('already enrolled')) {
          toast.info(t('checkout.alreadyEnrolled'))
          navigate({ name: 'player', courseId: course.id })
        } else {
          toast.error(message)
        }
      }
    },
    [navigate, requireLogin, t, user]
  )

  const modal = (
    <CheckoutModal
      session={session}
      onClose={() => setSession(null)}
      onSuccess={(courseId) => {
        setSession(null)
        navigate({ name: 'player', courseId })
      }}
    />
  )

  return { startPurchase, checkoutModal: modal }
}
