'use client'

import { useState } from 'react'
import { useI18n } from '@/i18n'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Lock, ShieldCheck, TriangleAlert, Wallet } from 'lucide-react'

export type CheckoutSession = {
  order: { id: string; razorpayOrderId: string; amount: number; currency: string }
  course: { id: string; title: string }
  checkout: { mode: 'demo' | 'live'; keyId: string | null; prefill?: { name: string; email: string } }
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Razorpay Standard Checkout.
 * Live mode: opens the official checkout.js widget.
 * Demo mode (no API keys): simulates the gateway hand-off — the same
 * server-side /api/payments/verify flow runs in both modes.
 */
export function CheckoutModal({
  session,
  onClose,
  onSuccess,
}: {
  session: CheckoutSession | null
  onClose: () => void
  onSuccess: (courseId: string) => void
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)

  if (!session) return null
  const isDemo = session.checkout.mode === 'demo'

  const verify = async (orderId: string, paymentId: string, signature: string) => {
    const res = await api.post<{ ok: boolean; courseId: string }>('/api/payments/verify', {
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    })
    return res
  }

  const simulate = async (outcome: 'success' | 'failure') => {
    setBusy(true)
    try {
      if (outcome === 'failure') {
        await api.post('/api/payments/mock-pay', { razorpayOrderId: session.order.razorpayOrderId, outcome })
        toast.error(t('checkout.failed'))
        onClose()
        return
      }
      // Gateway hand-off (demo)
      const gate = await api.post<{ razorpayPaymentId: string; razorpaySignature: string }>('/api/payments/mock-pay', {
        razorpayOrderId: session.order.razorpayOrderId,
        outcome,
      })
      // Server-side verification (same as production)
      await verify(session.order.razorpayOrderId, gate.razorpayPaymentId, gate.razorpaySignature)
      toast.success(t('checkout.success'))
      onSuccess(session.course.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'))
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const payLive = async () => {
    setBusy(true)
    const ok = await loadRazorpayScript()
    if (!ok || !window.Razorpay) {
      toast.error('Could not load Razorpay checkout')
      setBusy(false)
      return
    }
    try {
      const rzp = new window.Razorpay({
        key: session.checkout.keyId,
        amount: session.order.amount,
        currency: session.order.currency,
        name: 'Atom Nexus',
        description: session.course.title,
        order_id: session.order.razorpayOrderId,
        prefill: session.checkout.prefill,
        theme: { color: '#7700FF' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verify(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature)
            toast.success(t('checkout.success'))
            onSuccess(session.course.id)
          } catch (err) {
            toast.error(err instanceof Error ? err.message : t('checkout.failed'))
            onClose()
          } finally {
            setBusy(false)
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      })
      rzp.open()
    } catch (err) {
      setBusy(false)
      toast.error(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            {t('checkout.title')}
          </DialogTitle>
          <DialogDescription>
            {t('checkout.rzp')} · <span className="font-medium">{session.course.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="glass-soft rounded-md p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('checkout.orderFor')}</span>
            <span className="max-w-56 truncate font-medium">{session.course.title}</span>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('checkout.amount')}</span>
            <span className="text-2xl font-bold tracking-tight">{formatINR(session.order.amount)}</span>
          </div>
        </div>

        {isDemo ? (
          <>
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t('checkout.demoNotice')}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Button className="primary-button h-11" onClick={() => simulate('success')} disabled={busy}>
                <Wallet className="mr-1.5 h-4 w-4" />
                {busy ? t('checkout.processing') : t('checkout.simulateSuccess')}
              </Button>
              <Button variant="outline" onClick={() => simulate('failure')} disabled={busy}>
                {t('checkout.simulateFailure')}
              </Button>
            </div>
          </>
        ) : (
          <Button className="primary-button h-11" onClick={payLive} disabled={busy}>
            {busy ? t('checkout.processing') : `${t('checkout.pay', { amount: formatINR(session.order.amount) })}`}
          </Button>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> {t('checkout.secureBy')}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {isDemo ? 'DEMO' : 'LIVE'}
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}
