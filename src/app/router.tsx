import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import BinderPage from '@/features/binder/components/BinderPage'
import { AppLayout } from '@/app/layout'

// BinderPage stays eager: it is the index route and its deps (motion,
// TanStack Query) are entry dependencies regardless of lazy loading.
// The lazy components live in a non-component map so this module keeps a
// single (non-component) export and stays compatible with the fast-refresh rule.
const lazyRoutes = {
  cardDetail: lazy(() => import('@/features/binder/components/CardDetailPage')),
  wants: lazy(() => import('@/features/wants/components/WantsPage')),
}

const routeFallback = (
  <div className="route-fallback" aria-busy="true">
    Cargando…
  </div>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
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
    ],
  },
])
