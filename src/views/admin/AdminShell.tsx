'use client'

import { DashboardShell, type NavGroup } from '@/components/layout/DashboardShell'
import {
  BarChart3,
  BookOpen,
  CreditCard,
  Film,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Tags,
  Users,
} from 'lucide-react'

/**
 * Admin navigation, grouped by domain:
 *  Content → courses & catalogue management
 *  People  → learners & enrollments
 *  Commerce → payments
 *  System  → analytics & settings
 */
export const ADMIN_NAV: NavGroup[] = [
  {
    titleKey: 'shell.workspace',
    items: [{ view: { name: 'admin' }, labelKey: 'dash.overview', icon: LayoutDashboard }],
  },
  {
    titleKey: 'admin.groupContent',
    items: [
      { view: { name: 'admin-courses' }, labelKey: 'admin.courses', icon: BookOpen },
      { view: { name: 'admin-categories' }, labelKey: 'admin.categories', icon: Tags },
      { view: { name: 'admin-media' }, labelKey: 'admin.media', icon: Film },
    ],
  },
  {
    titleKey: 'admin.groupPeople',
    items: [
      { view: { name: 'admin-learners' }, labelKey: 'admin.learners', icon: Users },
      { view: { name: 'admin-enrollments' }, labelKey: 'admin.enrollments', icon: GraduationCap },
    ],
  },
  {
    titleKey: 'admin.groupCommerce',
    items: [{ view: { name: 'admin-payments' }, labelKey: 'admin.payments', icon: CreditCard }],
  },
  {
    titleKey: 'admin.groupSystem',
    items: [
      { view: { name: 'admin-analytics' }, labelKey: 'admin.analytics', icon: BarChart3 },
      { view: { name: 'admin-settings' }, labelKey: 'admin.settings', icon: Settings },
    ],
  },
]

export function AdminShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <DashboardShell kind="admin" groups={ADMIN_NAV} title={title}>
      {children}
    </DashboardShell>
  )
}
