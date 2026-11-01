import { z } from 'zod'

/**
 * Validation shared by login and register: both screens must agree on what a
 * valid email and password look like, so the rules live in one place instead
 * of drifting apart. Password strength beyond presence is a backend contract
 * (binder-api plan); the client only requires non-empty values.
 */
const emailField = z
  .string()
  .trim()
  .min(1, 'Ingresa tu correo')
  .email('Ingresa un correo válido')

const passwordField = z.string().min(1, 'Ingresa tu contraseña')

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
})

// Registration mirrors binder-api's limits (password 8-200, display name up to 60)
// so the form explains the problem instead of the API answering 400. Login stays
// lenient: an existing account's password is whatever the server accepted.
export const registerSchema = loginSchema.extend({
  password: passwordField
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(200, 'La contraseña puede tener hasta 200 caracteres'),
  displayName: z
    .string()
    .trim()
    .min(1, 'Ingresa un nombre para mostrar')
    .max(60, 'El nombre puede tener hasta 60 caracteres'),
})

export type LoginInput = z.input<typeof loginSchema>
export type LoginOutput = z.output<typeof loginSchema>
export type RegisterInput = z.input<typeof registerSchema>
export type RegisterOutput = z.output<typeof registerSchema>

/**
 * Profile edit rules. The `displayName` rule mirrors `registerSchema`'s today
 * but is deliberately its own contract: registration and profile editing may
 * diverge later (e.g. different length caps) without dragging each other.
 * Both messages are pinned by their page tests, so drift would be caught.
 * An empty avatar URL means "no avatar" and becomes `undefined`, matching how
 * `User.avatarUrl?` is typed.
 */
export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Ingresa un nombre para mostrar'),
  avatarUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || z.string().url().safeParse(value).success,
      'Ingresa una URL válida',
    )
    .transform((value) => (value === '' ? undefined : value)),
})

export type ProfileInput = z.input<typeof profileSchema>
export type ProfileOutput = z.output<typeof profileSchema>
