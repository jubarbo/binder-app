# Feature: identidad de trading (Etapa 2 del roadmap de frontend de la plataforma de trading)

Objetivo: darle a binder-app una noción real de "quién soy" — un seam de auth, un store de sesión, login/registro, un guard de rutas, un perfil, y el menú muerto "Mi cuenta"/"Cerrar sesión" hecho real. Se construye enteramente contra un puerto auth con mock, sin esperar a `binder-api`.

Contexto del roadmap: `odd/tasks/trading-platform-frontend.md`, Etapa 2.
Rama: por definir — se recomienda una `feature/*` nueva off `dev`; la actual `feature/catalog-locale-search` ya acumula trabajo sin merge de locale/DFC/wants.
Entrega: commits de unidad de trabajo por tarea. Runner de tests: `npx vitest run`; verificar `npm run build` + `npx oxlint`.

## Specs

S1 — Seam AuthPort. Crear `src/shared/api/authPort.ts`: un tipo `User` `{ id, email, displayName, avatarUrl? }`; una interfaz `AuthPort` con `session(signal?)`, `login(email, password, signal?)`, `register(email, password, displayName, signal?)`, `logout(signal?)`, `updateProfile({ displayName?, avatarUrl? }, signal?)`. Proveer `localAuthPort` (honesto sin backend: `session` → `null`; `login`/`register`/`updateProfile` rechazan con un `AuthUnavailableError` tipado; `logout` resuelve como no-op), `mockAuthPort` (detrás de `DEV && VITE_MOCK_AUTH === '1'`, mantiene un usuario mock a nivel de módulo para que login/session/logout/updateProfile se comporten como un único flujo falso coherente), y el binding `authPort`. Replica exactamente el patrón de `wishersPort`/`offersPort`.

S2 — Store de sesión. Un store zustand que expone el `User | null` actual más sus setters, arrancando en la carga con una llamada a `authPort.session()`. Consuma el seam de S1; sin UI todavía.

S3 — Login y registro. Pantallas + rutas; el submit llama `authPort.login`/`register`; en éxito guarda el usuario y navega al binder; en `AuthUnavailableError` muestra un estado honesto de "backend no conectado".

S4 — Guard de rutas. Las rutas de binder y deseos requieren sesión; el comportamiento del guard para datos que ya existen en `localStorage` sin sesión se decide acá (redirect duro vs estado suave de "sin sesión") para no romper la experiencia local-only.

S5 — Perfil. Una pantalla para editar `displayName` y `avatarUrl` vía `authPort.updateProfile`.

S6 — Conectar el menú. "Mi cuenta" navega al perfil; "Cerrar sesión" llama `authPort.logout()` y limpia la sesión. Ambos hoy renderizan como items muertos en `src/app/layout.tsx`.

## Tareas

T1 (S1) Seam AuthPort — inline — hecho (RED→GREEN 8/8), commit e5b99e8
T2 (S2) Store de sesión — inline — hecho (RED→GREEN 6/6), commit e640fec
T3 (S3) Pantallas de login y registro — inline — TODO
T4 (S4) Guard de rutas — inline — TODO
T5 (S5) Pantalla de perfil — inline — TODO
T6 (S6) Conectar el menú de usuario — inline — TODO

## Log

L1 (2026-10-16) Usuario: "Registra el plan en un md y luego comencemos con la etapa 2" — roadmap registrado como `odd/tasks/trading-platform-frontend.md`; comenzando la Etapa 2 (seam de identidad + login).

L2 (2026-10-16) T1 implementado. `src/shared/api/authPort.ts` + `authPort.test.ts`. Nota de diseño: a diferencia de `wishersPort`/`offersPort` (que devuelven listas vacías honestas), `localAuthPort` RECHAZA `login`/`register`/`updateProfile` con un `AuthUnavailableError` tipado en vez de fabricar un usuario — porque una sesión falsa parecería "perder" el login al recargar. `session()` devuelve `null`, `logout()` es no-op. `mockAuthPort` mantiene un usuario a nivel de módulo para que login/session/logout/updateProfile se lean como un flujo coherente. 8/8 verde. Commiteado como e5b99e8 en `feature/trading-identity` (creada off `dev` actualizado tras el PR #17).

L3 (2026-10-17) T2 implementado. `src/features/auth/state/sessionStore.ts` + test. Nota de diseño: el store NO se persiste deliberadamente — la fuente de verdad es el puerto auth (cookie en el backend, `null` localmente), así que arranca con `authPort.session()` en cada carga en vez de confiar en una copia vieja de localStorage. `signOut` limpia el usuario local primero (un fallo del puerto nunca deja al usuario trabado en una UI de sesión iniciada) y luego delega en `authPort.logout()`, cuya negación aún se propaga. 6/6 verde; suite completa 208/208, build OK, oxlint exit=0. Commiteado como e640fec.
