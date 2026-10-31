import { lazy, Suspense } from 'react'
import { createHashRouter } from 'react-router-dom'
import BinderPage from '@/features/binder/components/BinderPage'
import RequireSession from '@/features/auth/components/RequireSession'
import NotFoundPage from '@/app/NotFoundPage'
import RouteErrorPage from '@/app/RouteErrorPage'
import { AppLayout } from '@/app/layout'

// BinderPage stays eager: it is the index route and its deps (motion,
// TanStack Query) are entry dependencies regardless of lazy loading.
// The lazy components live in a non-component map so this module keeps a
// single (non-component) export and stays compatible with the fast-refresh rule.
const lazyRoutes = {
  cardDetail: lazy(() => import('@/features/binder/components/CardDetailPage')),
  wants: lazy(() => import('@/features/wants/components/WantsPage')),
  login: lazy(() => import('@/features/auth/components/LoginPage')),
  register: lazy(() => import('@/features/auth/components/RegisterPage')),
  profile: lazy(() => import('@/features/auth/components/ProfilePage')),
}

const routeFallback = (
  <div className="route-fallback" aria-busy="true">
    Cargando…
  </div>
)

// Fresh instance per call so tests can control the initial hash; the app
// binds the singleton below.
export function createAppRouter() {
  return createHashRouter([
    {
      path: '/',
      element: <AppLayout />,
      // Catches render failures anywhere below (the raw developer boundary
      // is not a user experience).
      errorElement: <RouteErrorPage />,
      children: [
        // The collection routes sit behind the session guard (enforced only
        // when an auth system backs the app); auth routes stay public.
        {
          element: <RequireSession />,
          children: [
            { index: true, element: <BinderPage /> },
            {
              path: 'card/:entryId',
              element: (
                <Suspense fallback={routeFallback}>
                  <lazyRoutes.cardDetail />
                </Suspense>
              ),
            },
            {
              path: 'wants',
              element: (
                <Suspense fallback={routeFallback}>
                  <lazyRoutes.wants />
                </Suspense>
              ),
            },
            {
              path: 'profile',
              element: (
                <Suspense fallback={routeFallback}>
                  <lazyRoutes.profile />
                </Suspense>
              ),
            },
          ],
        },
        {
          path: 'login',
          element: (
            <Suspense fallback={routeFallback}>
              <lazyRoutes.login />
            </Suspense>
          ),
        },
        {
          path: 'register',
          element: (
            <Suspense fallback={routeFallback}>
              <lazyRoutes.register />
            </Suspense>
          ),
        },
        // Friendly catch-all: any unmatched hash renders this instead of
        // React Router's default "Unexpected Application Error!" screen.
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ])
}

export const router = createAppRouter()
