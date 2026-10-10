import { createBrowserRouter } from 'react-router-dom'
import BinderPage from '../features/binder/components/BinderPage'
import WantsPage from '../features/wants/components/WantsPage'
import { AppLayout } from './layout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <BinderPage /> },
      { path: 'wants', element: <WantsPage /> },
    ],
  },
])