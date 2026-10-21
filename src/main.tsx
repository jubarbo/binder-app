import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/app/App'
import { startBinderSync } from '@/features/binder/state/binderSync'
import { apiConfigured } from '@/shared/api/apiClient'

// With binder-api the server owns the binder: follow the session to load/clear it.
if (apiConfigured) startBinderSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)