import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { authPort, AuthUnavailableError } from '@/shared/api/authPort'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import {
  profileSchema,
  type ProfileInput,
  type ProfileOutput,
} from '@/features/auth/authSchemas'

/**
 * Profile editor: display name and avatar URL against the `AuthPort`. The
 * email is identity, not a profile field, so it renders read-only. A
 * local-only install has no session to edit and gets a sign-in path instead
 * of the form.
 */
export default function ProfilePage() {
  const user = useSessionStore((state) => state.user)
  const signIn = useSessionStore((state) => state.signIn)
  const [saved, setSaved] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    },
  })

  const submit = async (data: ProfileOutput) => {
    try {
      const updated = await authPort.updateProfile({
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      })
      signIn(updated)
      setSaved(true)
    } catch (error) {
      // No fake success: the local port refuses when there is no backend.
      setError('root', {
        message:
          error instanceof AuthUnavailableError
            ? 'El backend no está conectado todavía: no se puede actualizar el perfil sin servidor.'
            : 'No se pudo guardar el perfil. Intenta de nuevo.',
      })
    }
  }

  if (user === null) {
    return (
      <section className="page auth-page">
        <h1>Mi perfil</h1>
        <p>No hay una sesión activa en este navegador.</p>
        <p className="auth-switch">
          <Link to="/login">Inicia sesión</Link> para editar tu perfil.
        </p>
      </section>
    )
  }

  return (
    <section className="page auth-page">
      <h1>Mi perfil</h1>
      <form className="auth-form" noValidate onSubmit={handleSubmit(submit)}>
        {errors.root && (
          <p className="auth-form-error" role="alert">
            {errors.root.message}
          </p>
        )}
        {saved && (
          <p className="auth-form-success" role="status">
            Perfil actualizado
          </p>
        )}
        <label htmlFor="profile-email">Correo electrónico</label>
        <input
          id="profile-email"
          className="field auth-readonly"
          type="email"
          value={user.email}
          readOnly
        />
        <label htmlFor="profile-display-name">Nombre para mostrar</label>
        <input
          id="profile-display-name"
          className="field"
          type="text"
          autoComplete="name"
          {...register('displayName')}
        />
        {errors.displayName && (
          <span className="field-error" role="alert">
            {errors.displayName.message}
          </span>
        )}
        <label htmlFor="profile-avatar-url">URL del avatar</label>
        <input
          id="profile-avatar-url"
          className="field"
          type="url"
          autoComplete="url"
          {...register('avatarUrl')}
        />
        {errors.avatarUrl && (
          <span className="field-error" role="alert">
            {errors.avatarUrl.message}
          </span>
        )}
        <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
          Guardar cambios
        </button>
      </form>
    </section>
  )
}
