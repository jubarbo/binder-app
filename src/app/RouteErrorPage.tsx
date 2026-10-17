import { Link } from 'react-router-dom'

/**
 * Root `errorElement`: catches render failures — including lazy chunks that
 * fail to load while a deploy is landing — and shows an honest page with a
 * way back instead of React Router's raw developer boundary.
 */
export default function RouteErrorPage() {
  return (
    <section className="page">
      <h1>Algo salió mal</h1>
      <p>
        La aplicación encontró un error inesperado. Si vuelve a pasar, recarga
        la página.
      </p>
      <p>
        <Link to="/">Volver al binder</Link>
      </p>
    </section>
  )
}
