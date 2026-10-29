'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/** Cycles through `words` with a smooth vertical flip (Magic UI Word Rotate). */
export function WordRotate({
  words,
  duration = 2600,
  className,
}: {
  words: string[]
  duration?: number
  className?: string
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % words.length), duration)
    return () => clearInterval(interval)
  }, [words, duration])

  return (
    <span className="word-rotate-mask">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          className={cn('inline-block will-change-transform', className)}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -26 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
