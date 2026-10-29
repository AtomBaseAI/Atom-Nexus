'use client'

import { useSyncExternalStore, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

const emptySubscribe = () => () => {}
/** false during SSR / before hydration, true after — avoids hydration mismatch. */
const useMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false)

/** Minimal View Transitions API typing (not in all TS DOM libs yet). */
type DocumentWithVT = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> }
}

/**
 * AnimatedThemeToggler — Magic UI.
 * Switches light/dark with a circular view-transition reveal that expands
 * from the button itself. Falls back to an instant switch when the browser
 * does not support the View Transitions API.
 */
export function AnimatedThemeToggler({
  className,
  duration = 700,
}: {
  className?: string
  duration?: number
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const isDark = mounted && resolvedTheme === 'dark'

  const toggleTheme = async () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    const doc = document as DocumentWithVT

    const apply = () => {
      // Persist via next-themes (state + localStorage + `<html>` class).
      setTheme(next)
      // Apply the class synchronously so the transition snapshot is correct
      // even though React commits asynchronously.
      document.documentElement.classList.toggle('dark', next === 'dark')
    }

    // Fallback: browsers without the View Transitions API just switch.
    if (typeof doc.startViewTransition !== 'function' || !buttonRef.current) {
      apply()
      return
    }

    const transition = doc.startViewTransition(apply)
    await transition.ready

    const { top, left, width, height } = buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2

    // Radius covering the farthest viewport corner from the button.
    const right = window.innerWidth - left
    const bottom = window.innerHeight - top
    const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom))

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  }

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      type="button"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          className="flex"
          initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
