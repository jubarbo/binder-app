import { createBrowserRouter } from 'react-router-dom'
import BinderPage from '@/features/binder/components/BinderPage'
import CardDetailPage from '@/features/binder/components/CardDetailPage'
import WantsPage from '@/features/wants/components/WantsPage'
import { AppLayout } from '@/app/layout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <BinderPage /> },
      { path: 'card/:entryId', element: <CardDetailPage /> },
      { path: 'wants', element: <WantsPage /> },
    ],
  },
])