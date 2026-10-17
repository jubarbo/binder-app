import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { authPort, AuthUnavailableError } from '@/shared/api/authPort'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import {
  loginSchema,
  type LoginInput,
  type LoginOutput,
} from '@/features/auth/authSchemas'

/** Sign-in screen: email + password against the `AuthPort` binding. */
export default function LoginPage() {
  const signIn = useSessionStore((state) => state.signIn)
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput, unknown, LoginOutput>({
    resolver: zodResolver(loginSchema),
  })

  const submit = async (data: LoginOutput) => {
    try {
      const user = await authPort.login(data.email, data.password)
      signIn(user)
      navigate('/')
    } catch (error) {
      // The local port refuses when there is no backend: say that plainly
      // instead of pretending the credentials were wrong.
      setError('root', {
        message:
          error instanceof AuthUnavailableError
            ? 'El backend no está conectado todavía: no se puede iniciar sesión sin servidor.'
            : 'No se pudo iniciar sesión. Intenta de nuevo.',
      })
    }
  }

  return (
    <section className="page auth-page">
      <h1>Iniciar sesión</h1>
      <form className="auth-form" noValidate onSubmit={handleSubmit(submit)}>
        {errors.root && (
          <p className="auth-form-error" role="alert">
            {errors.root.message}
          </p>
        )}
        <label htmlFor="login-email">Correo electrónico</label>
        <input
          id="login-email"
          className="field"
          type="email"
          autoComplete="username"
          {...register('email')}
        />
        {errors.email && (
          <span className="field-error" role="alert">
            {errors.email.message}
          </span>
        )}
        <label htmlFor="login-password">Contraseña</label>
        <input
          id="login-password"
          className="field"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && (
          <span className="field-error" role="alert">
            {errors.password.message}
          </span>
        )}
        <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
          Entrar
        </button>
        <p className="auth-switch">
          ¿No tienes cuenta? <Link to="/register">Crea una cuenta</Link>
        </p>
      </form>
    </section>
  )
}
