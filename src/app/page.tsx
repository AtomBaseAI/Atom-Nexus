'use client'

import { useEffect } from 'react'
import { useNavStore, restoreView } from '@/stores/nav-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n'
import { toast } from 'sonner'
import { Atom, Loader2, ShieldAlert, LayoutDashboard, Home as HomeIcon } from 'lucide-react'

// Public views
import { LandingView } from '@/views/public/LandingView'
import { CatalogView } from '@/views/public/CatalogView'
import { CourseDetailView } from '@/views/public/CourseDetailView'
import { PolicyView } from '@/views/public/PolicyView'
import { LoginView, RegisterView, ForgotPasswordView } from '@/views/public/AuthViews'

// Learner views (self-wrapped in LearnShell)
import { LearnDashboardView } from '@/views/learn/LearnDashboardView'
import { MyCoursesView } from '@/views/learn/MyCoursesView'
import { OrdersView } from '@/views/learn/OrdersView'
import { CertificatesView } from '@/views/learn/CertificatesView'
import { ProfileView } from '@/views/learn/ProfileView'
import { PlayerView } from '@/views/learn/PlayerView'

// Admin views (self-wrapped in AdminShell)
import { AdminOverviewView } from '@/views/admin/AdminOverviewView'
import { AdminCoursesView } from '@/views/admin/AdminCoursesView'
import { AdminCourseEditorView } from '@/views/admin/AdminCourseEditorView'
import { AdminMediaView } from '@/views/admin/AdminMediaView'
import { AdminLearnersView } from '@/views/admin/AdminLearnersView'
import { AdminEnrollmentsView } from '@/views/admin/AdminEnrollmentsView'
import { AdminPaymentsView } from '@/views/admin/AdminPaymentsView'
import { AdminAnalyticsView } from '@/views/admin/AdminAnalyticsView'
import { AdminCategoriesView } from '@/views/admin/AdminCategoriesView'
import { AdminSettingsView } from '@/views/admin/AdminSettingsView'

import { Button } from '@/components/ui/button'

/* ------------------------------------------------------------------ */
/* Splash shown while the session is being restored                    */
/* ------------------------------------------------------------------ */
function Splash() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
        <Atom className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>{t('brand.name')}</span>
      </div>
      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Access denied panel for learners opening admin views                */
/* ------------------------------------------------------------------ */
function AccessDenied() {
  const { t } = useI18n()
  const navigate = useNavStore((s) => s.navigate)
  const resetTo = useNavStore((s) => s.resetTo)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass w-full max-w-md rounded-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold">Access restricted</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This area is only available to platform administrators. If you believe this is a mistake,
          contact the support team.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={() => resetTo({ name: 'learn' })}>
            <LayoutDashboard className="h-4 w-4" /> {t('nav.dashboard')}
          </Button>
          <Button variant="outline" onClick={() => resetTo({ name: 'landing' })}>
            <HomeIcon className="h-4 w-4" /> {t('nav.home')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Root shell: restores the session, guards views, renders the router  */
/* ------------------------------------------------------------------ */
export default function Home() {
  const view = useNavStore((s) => s.view)
  const navigate = useNavStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  const refresh = useAuthStore((s) => s.refresh)
  const { t } = useI18n()

  // Restore the last view of this session, then the session itself.
  useEffect(() => {
    const saved = restoreView()
    if (saved && saved.name !== 'landing') {
      useNavStore.getState().resetTo(saved)
    }
    void refresh()
  }, [refresh])

  const isLearnerArea =
    view.name === 'learn' ||
    view.name === 'learn-courses' ||
    view.name === 'learn-orders' ||
    view.name === 'learn-certificates' ||
    view.name === 'learn-profile' ||
    view.name === 'player'
  const isAdminArea = view.name.startsWith('admin')

  // Route guards: unauthenticated users are sent to login; learners
  // opening admin views get an access-denied panel instead.
  useEffect(() => {
    if (status !== 'ready') return
    if ((isLearnerArea || isAdminArea) && !user) {
      toast.info(t('toast.needLogin'))
      navigate({ name: 'login' }, { replace: true })
    }
  }, [status, user, isLearnerArea, isAdminArea, navigate, t])

  // Session restore splash — also protects API-driven views from
  // firing unauthenticated requests on first paint.
  if (status === 'loading') {
    return <Splash />
  }

  // Unauthenticated hit on a protected area: show splash while the
  // guard effect above redirects to the login view.
  if ((isLearnerArea || isAdminArea) && !user) {
    return <Splash />
  }

  // Role guard for admin area.
  if (isAdminArea && user?.role !== 'ADMIN') {
    return <AccessDenied />
  }

  switch (view.name) {
    /* Public */
    case 'landing':
      return <LandingView />
    case 'catalog':
      return <CatalogView initialCategory={view.categorySlug} />
    case 'course':
      return <CourseDetailView slug={view.slug} />
    case 'policy':
      return <PolicyView slug={view.slug} />
    case 'login':
      return <LoginView />
    case 'register':
      return <RegisterView />
    case 'forgot-password':
      return <ForgotPasswordView />

    /* Learner */
    case 'learn':
      return <LearnDashboardView />
    case 'learn-courses':
      return <MyCoursesView />
    case 'learn-orders':
      return <OrdersView />
    case 'learn-certificates':
      return <CertificatesView />
    case 'learn-profile':
      return <ProfileView />
    case 'player':
      return <PlayerView courseId={view.courseId} lessonId={view.lessonId} />

    /* Admin */
    case 'admin':
      return <AdminOverviewView />
    case 'admin-courses':
      return <AdminCoursesView />
    case 'admin-editor':
      return <AdminCourseEditorView courseId={view.courseId} />
    case 'admin-media':
      return <AdminMediaView />
    case 'admin-learners':
      return <AdminLearnersView />
    case 'admin-enrollments':
      return <AdminEnrollmentsView />
    case 'admin-payments':
      return <AdminPaymentsView />
    case 'admin-analytics':
      return <AdminAnalyticsView />
    case 'admin-categories':
      return <AdminCategoriesView />
    case 'admin-settings':
      return <AdminSettingsView />

    default:
      return <LandingView />
  }
}
