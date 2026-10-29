'use client'

import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

/** Animated counter that ticks from `startValue` to `value` when scrolled into view. */
export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  className,
}: {
  value: number
  startValue?: number
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(startValue)
  const springValue = useSpring(motionValue, { damping: 48, stiffness: 90 })
  const isInView = useInView(ref, { once: true, margin: '0px' })

  useEffect(() => {
    if (!isInView) return
    const timer = setTimeout(() => motionValue.set(value), delay * 1000)
    return () => clearTimeout(timer)
  }, [motionValue, isInView, delay, value])

  useEffect(
    () =>
      springValue.on('change', (latest) => {
        if (ref.current) {
          ref.current.textContent = Intl.NumberFormat('en-US', {
            maximumFractionDigits: 0,
          }).format(Math.round(latest))
        }
      }),
    [springValue],
  )

  return (
    <span ref={ref} className={cn('inline-block tabular-nums tracking-tight', className)}>
      {Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(startValue)}
    </span>
  )
}
