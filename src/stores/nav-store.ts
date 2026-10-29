'use client'

import { create } from 'zustand'

export type View =
  | { name: 'landing' }
  | { name: 'catalog'; categorySlug?: string; q?: string }
  | { name: 'course'; slug: string }
  | { name: 'policy'; slug: string }
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'forgot-password' }
  | { name: 'learn' }
  | { name: 'learn-courses' }
  | { name: 'learn-orders' }
  | { name: 'learn-certificates' }
  | { name: 'learn-profile' }
  | { name: 'player'; courseId: string; lessonId?: string }
  | { name: 'admin' }
  | { name: 'admin-courses' }
  | { name: 'admin-editor'; courseId?: string }
  | { name: 'admin-media' }
  | { name: 'admin-learners' }
  | { name: 'admin-enrollments' }
  | { name: 'admin-payments' }
  | { name: 'admin-analytics' }
  | { name: 'admin-categories' }
  | { name: 'admin-settings' }

type PendingAction = { type: 'buy'; slug: string } | { type: 'enroll'; slug: string } | null

type NavState = {
  stack: View[]
  view: View
  pending: PendingAction
  navigate: (v: View, opts?: { replace?: boolean }) => void
  back: () => void
  setPending: (p: PendingAction) => void
  resetTo: (v: View) => void
}

const HOME: View = { name: 'landing' }

const VIEW_STORAGE_KEY = 'lms-view'

function persistView(v: View) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

/** Last view stored this session (survives page reloads). Returns null if none. */
export function restoreView(): View | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(VIEW_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as View
    return parsed && typeof parsed.name === 'string' ? parsed : null
  } catch {
    return null
  }
}

export const useNavStore = create<NavState>()((set, get) => ({
  stack: [HOME],
  view: HOME,
  pending: null,

  navigate: (v, opts) => {
    if (opts?.replace) {
      const stack = [...get().stack]
      stack[stack.length - 1] = v
      set({ view: v, stack })
    } else {
      set({ view: v, stack: [...get().stack, v] })
    }
    persistView(v)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  },

  back: () => {
    const { stack } = get()
    if (stack.length > 1) {
      const next = stack.slice(0, -1)
      set({ stack: next, view: next[next.length - 1] })
      persistView(next[next.length - 1])
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    } else {
      set({ view: HOME, stack: [HOME] })
      persistView(HOME)
    }
  },

  setPending: (pending) => set({ pending }),

  resetTo: (v) => {
    set({ view: v, stack: [v] })
    persistView(v)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  },
}))

export function viewKey(v: View): string {
  return JSON.stringify(v)
}
