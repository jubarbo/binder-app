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

export const registerSchema = loginSchema.extend({
  displayName: z.string().trim().min(1, 'Ingresa un nombre para mostrar'),
})

export type LoginInput = z.input<typeof loginSchema>
export type LoginOutput = z.output<typeof loginSchema>
export type RegisterInput = z.input<typeof registerSchema>
export type RegisterOutput = z.output<typeof registerSchema>
