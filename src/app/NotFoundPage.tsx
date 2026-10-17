import { Link } from 'react-router-dom'

/**
 * Friendly catch-all for unmatched hash routes. React Router's default
 * boundary is a developer screen ("Unexpected Application Error!"); users
 * deserve a page that explains itself and offers a way back.
 */
export default function NotFoundPage() {
  return (
    <section className="page">
      <h1>Página no encontrada</h1>
      <p>La ruta que pediste no existe en Binder.</p>
      <p>
        <Link to="/">Volver al binder</Link>
      </p>
    </section>
  )
}
