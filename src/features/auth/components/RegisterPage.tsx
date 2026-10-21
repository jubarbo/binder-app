import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { authPort } from '@/shared/api/authPort'
import { authErrorMessage } from '@/features/auth/authErrors'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import {
  registerSchema,
  type RegisterInput,
  type RegisterOutput,
} from '@/features/auth/authSchemas'

/** Registration screen: creates the account through the `AuthPort` binding. */
export default function RegisterPage() {
  const signIn = useSessionStore((state) => state.signIn)
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput, unknown, RegisterOutput>({
    resolver: zodResolver(registerSchema),
  })

  const submit = async (data: RegisterOutput) => {
    try {
      const user = await authPort.register(
        data.email,
        data.password,
        data.displayName,
      )
      signIn(user)
      navigate('/')
    } catch (error) {
      // Same honesty contract as the login screen: no backend, no invented
      // credentials error; API failures map to specific messages.
      setError('root', { message: authErrorMessage(error, 'register') })
    }
  }

  return (
    <section className="page auth-page">
      <h1>Crear cuenta</h1>
      <form className="auth-form" noValidate onSubmit={handleSubmit(submit)}>
        {errors.root && (
          <p className="auth-form-error" role="alert">
            {errors.root.message}
          </p>
        )}
        <label htmlFor="register-email">Correo electrónico</label>
        <input
          id="register-email"
          className="field"
          type="email"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && (
          <span className="field-error" role="alert">
            {errors.email.message}
          </span>
        )}
        <label htmlFor="register-password">Contraseña</label>
        <input
          id="register-password"
          className="field"
          type="password"
          autoComplete="new-password"
          {...register('password')}
        />
        {errors.password && (
          <span className="field-error" role="alert">
            {errors.password.message}
          </span>
        )}
        <label htmlFor="register-display-name">Nombre para mostrar</label>
        <input
          id="register-display-name"
          className="field"
          type="text"
          autoComplete="nickname"
          {...register('displayName')}
        />
        {errors.displayName && (
          <span className="field-error" role="alert">
            {errors.displayName.message}
          </span>
        )}
        <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
          Crear cuenta
        </button>
        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </section>
  )
}
