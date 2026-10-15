import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'

/** Root component: providers wrapped around the router. */
export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}