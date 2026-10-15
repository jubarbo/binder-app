import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import CardFlightOverlay from '@/features/binder/components/CardFlightOverlay'

/** App shell: top navigation plus the routed page outlet. */
export function AppLayout() {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
              <span role="menuitem" className="app-user-menu-item">
                Mi cuenta
              </span>
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
              <button
                type="button"
                role="menuitem"
                className="app-user-menu-item"
                onClick={closeUserMenu}
              >
                Cerrar sesión
              </button>
            </div>
          )}
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