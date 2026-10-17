import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import CardFlightOverlay from '@/features/binder/components/CardFlightOverlay'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  useLocaleStore,
} from '@/shared/locale/localeStore'

/** App shell: top navigation plus the routed page outlet. */
export function AppLayout() {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const bootstrap = useSessionStore((state) => state.bootstrap)
  const user = useSessionStore((state) => state.user)
  const signOut = useSessionStore((state) => state.signOut)

  // One session read per app load; the guard and the menu read the result.
  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)
  // One control cycles the supported locales; with es/en it flips between them.
  const nextLocale =
    SUPPORTED_LOCALES[(SUPPORTED_LOCALES.indexOf(locale) + 1) % SUPPORTED_LOCALES.length]

  useEffect(() => {
    if (!userMenuOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [userMenuOpen])

  const closeUserMenu = () => setUserMenuOpen(false)

  const handleSignOut = async () => {
    closeUserMenu()
    try {
      // signOut clears the local user first, so from here only the
      // server-side session can still fail — and that failure is real.
      await signOut()
    } catch {
      toast.error('No se pudo cerrar la sesión en el servidor.')
    }
  }

  return (
    <div className="app-shell">
      <header className="app-nav">
        <span className="app-brand">Binder</span>
        <nav className="app-nav-links" aria-label="Navegación principal">
          <NavLink to="/" end>
            Binder
          </NavLink>
          <NavLink to="/wants">Deseos</NavLink>
        </nav>
        <div className="app-nav-actions">
          <button
            type="button"
            className="app-locale-toggle"
            aria-label={`Cambiar idioma a ${LOCALE_LABELS[nextLocale]}`}
            onClick={() => setLocale(nextLocale)}
          >
            {locale.toUpperCase()}
          </button>
          <div className="app-user-menu" ref={menuRef}>
            <button
              type="button"
              className="app-user-menu-trigger"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-label="Menú"
              onClick={() => setUserMenuOpen((open) => !open)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {userMenuOpen && (
              <div className="app-user-menu-list" role="menu">
                {user ? (
                  <NavLink
                    to="/profile"
                    role="menuitem"
                    className="app-user-menu-item"
                    onClick={closeUserMenu}
                  >
                    Mi cuenta
                  </NavLink>
                ) : (
                  <NavLink
                    to="/login"
                    role="menuitem"
                    className="app-user-menu-item"
                    onClick={closeUserMenu}
                  >
                    Iniciar sesión
                  </NavLink>
                )}
                <NavLink
                  to="/"
                  end
                  role="menuitem"
                  className="app-user-menu-item"
                  onClick={closeUserMenu}
                >
                  Binder
                </NavLink>
                <NavLink
                  to="/wants"
                  role="menuitem"
                  className="app-user-menu-item"
                  onClick={closeUserMenu}
                >
                  Deseos
                </NavLink>
                {user && (
                  <button
                    type="button"
                    role="menuitem"
                    className="app-user-menu-item"
                    onClick={() => void handleSignOut()}
                  >
                    Cerrar sesión
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <CardFlightOverlay />
      {/* App-wide notifications. `role="status"` keeps them polite for screen
          readers; `theme="auto"` follows the same OS preference as the app. */}
      {/* react-toastify v11 has no "auto" theme (the type accepts any string,
          which is what let "auto" compile): an unknown theme adds no class and
          the toast gets no background at all. Both light and dark therefore
          point at the same scheme-aware token, so the OS preference is honored
          through our tokens instead of through the library. */}
      <ToastContainer position="bottom-center" theme="light" role="status" />
    </div>
  )
}