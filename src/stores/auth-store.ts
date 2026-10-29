'use client'

import { create } from 'zustand'
import { api } from '@/lib/api'
import { useI18nStore, type LocaleCode } from '@/i18n'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'LEARNER'
  preferredLocale: string
}

type AuthState = {
  user: AuthUser | null
  status: 'loading' | 'ready'
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<AuthUser>
  register: (name: string, email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  updateProfile: (data: { name?: string; preferredLocale?: string }) => Promise<AuthUser>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  status: 'loading',

  refresh: async () => {
    try {
      const res = await api.get<{ user: AuthUser }>('/api/auth/me')
      set({ user: res.user, status: 'ready' })
      if (res.user.preferredLocale) {
        const { locale } = useI18nStore.getState()
        if (locale !== res.user.preferredLocale) {
          useI18nStore.setState({ locale: res.user.preferredLocale as LocaleCode })
        }
      }
    } catch {
      set({ user: null, status: 'ready' })
    }
  },

  login: async (email, password) => {
    const res = await api.post<{ user: AuthUser }>('/api/auth/login', { email, password })
    set({ user: res.user, status: 'ready' })
    if (res.user.preferredLocale) {
      useI18nStore.setState({ locale: res.user.preferredLocale as LocaleCode })
    }
    return res.user
  },

  register: async (name, email, password) => {
    const res = await api.post<{ user: AuthUser }>('/api/auth/register', { name, email, password })
    set({ user: res.user, status: 'ready' })
    return res.user
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      set({ user: null, status: 'ready' })
    }
  },

  updateProfile: async (data) => {
    const res = await api.patch<{ user: AuthUser }>('/api/auth/me', data)
    set({ user: res.user })
    return res.user
  },
}))

/** Convenience selector hook. */
export function useUser() {
  return useAuthStore((s) => s.user)
}
