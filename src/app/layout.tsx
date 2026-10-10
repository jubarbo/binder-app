import { NavLink, Outlet } from 'react-router-dom'

/** App shell: top navigation plus the routed page outlet. */
export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-nav">
        <span className="app-brand">Binder</span>
        <nav className="app-nav-links" aria-label="Main navigation">
          <NavLink to="/" end>
            Binder
          </NavLink>
          <NavLink to="/wants">Wants</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}