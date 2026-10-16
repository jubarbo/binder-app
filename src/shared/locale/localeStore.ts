import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Locales the app can display and search. Mirrors the backend's
 * SUPPORTED_LOCALES (binder-api §3.1): adding a language here means the app
 * can render it, and the catalog must be able to serve it.
 */
export const SUPPORTED_LOCALES = ['en', 'es'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

/** Display name for each locale, in that locale's own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
}

/**
 * Storage key for the persisted locale preference. Kept separate from the
 * binder payload (`binder-app:binder:v1`) so a UI setting never touches the
 * versioned binder envelope.
 */
const LOCALE_STORAGE_KEY = 'binder-app:locale:v1'

interface LocaleState {
  /** Active locale; `es` by default to match the Spanish UI. */
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'es',
      setLocale: (locale) => set({ locale }),
    }),
    { name: LOCALE_STORAGE_KEY },
  ),
)

/**
 * Read the active locale outside React (e.g. from the catalog client).
 * `getState()` avoids subscribing non-React code to the store.
 */
export function getActiveLocale(): Locale {
  return useLocaleStore.getState().locale
}
