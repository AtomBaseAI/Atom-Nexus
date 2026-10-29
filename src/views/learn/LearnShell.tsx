'use client'

import { DashboardShell, type NavGroup } from '@/components/layout/DashboardShell'
import { Award, BookOpen, Compass, LayoutDashboard, Receipt, User } from 'lucide-react'

/** Learner navigation: core learning surface, then account & records. */
export const LEARN_NAV: NavGroup[] = [
  {
    titleKey: 'shell.groupLearn',
    items: [
      { view: { name: 'learn' }, labelKey: 'dash.overview', icon: LayoutDashboard },
      { view: { name: 'learn-courses' }, labelKey: 'dash.myLearning', icon: BookOpen },
      { view: { name: 'catalog' }, labelKey: 'dash.explore', icon: Compass },
    ],
  },
  {
    titleKey: 'shell.groupAccount',
    items: [
      { view: { name: 'learn-orders' }, labelKey: 'dash.orders', icon: Receipt },
      { view: { name: 'learn-certificates' }, labelKey: 'dash.certificates', icon: Award },
      { view: { name: 'learn-profile' }, labelKey: 'dash.profile', icon: User },
    ],
  },
]

export function LearnShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <DashboardShell kind="learn" groups={LEARN_NAV} title={title}>
      {children}
    </DashboardShell>
  )
}
