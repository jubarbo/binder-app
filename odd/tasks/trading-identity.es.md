# Feature: identidad de trading (Etapa 2 del roadmap de frontend de la plataforma de trading)

Objetivo: darle a binder-app una noción real de "quién soy" — un seam de auth, un store de sesión, login/registro, un guard de rutas, un perfil, y el menú muerto "Mi cuenta"/"Cerrar sesión" hecho real. Se construye enteramente contra un puerto auth con mock, sin esperar a `binder-api`.

Contexto del roadmap: `odd/tasks/trading-platform-frontend.md`, Etapa 2.
Rama: por definir — se recomienda una `feature/*` nueva off `dev`; la actual `feature/catalog-locale-search` ya acumula trabajo sin merge de locale/DFC/wants.
Entrega: commits de unidad de trabajo por tarea. Runner de tests: `npx vitest run`; verificar `npm run build` + `npx oxlint`.

## Specs

S1 — Seam AuthPort. Crear `src/shared/api/authPort.ts`: un tipo `User` `{ id, email, displayName, avatarUrl? }`; una interfaz `AuthPort` con `available: boolean` (si un sistema de auth respalda al puerto — el guard de rutas lo consulta antes de exigir sesión), `session(signal?)`, `login(email, password, signal?)`, `register(email, password, displayName, signal?)`, `logout(signal?)`, `updateProfile({ displayName?, avatarUrl? }, signal?)`. Proveer `localAuthPort` (honesto sin backend: `session` → `null`; `login`/`register`/`updateProfile` rechazan con un `AuthUnavailableError` tipado; `logout` resuelve como no-op), `mockAuthPort` (detrás de `DEV && VITE_MOCK_AUTH === '1'`, mantiene un usuario mock a nivel de módulo para que login/session/logout/updateProfile se comporten como un único flujo falso coherente), y el binding `authPort`. Replica exactamente el patrón de `wishersPort`/`offersPort`.

S2 — Store de sesión. Un store zustand que expone el `User | null` actual más sus setters, arrancando en la carga con una llamada a `authPort.session()`. Consuma el seam de S1; sin UI todavía.

S3 — Login y registro. Pantallas + rutas; el submit llama `authPort.login`/`register`; en éxito guarda el usuario y navega al binder; en `AuthUnavailableError` muestra un estado honesto de "backend no conectado".

S4 — Guard de rutas. Resuelto por decisión del usuario (ver L5): el guard exige sesión solo cuando un sistema de auth respalda la app. `RequireSession` envuelve las rutas de binder, detalle de carta y deseos: cuando `authPort.available` es true y no hay sesión, redirige a `/login`; en una instalación local pura (`available === false`) todas las rutas quedan abiertas, así que la experiencia local-first nunca se bloquea. Durante el bootstrap sostiene la vista actual detrás del fallback en vez de adivinar. `AppLayout` ejecuta `bootstrap()` exactamente una vez por carga. La estricta exigencia en cualquier instalación se vuelve automática cuando el adapter real del backend (`available: true`) reemplace el binding.

S5 — Perfil. Una pantalla para editar `displayName` y `avatarUrl` vía `authPort.updateProfile`.

S6 — Conectar el menú. "Mi cuenta" navega al perfil; "Cerrar sesión" llama `authPort.logout()` y limpia la sesión. Ambos hoy renderizan como items muertos en `src/app/layout.tsx`.

## Tareas

T1 (S1) Seam AuthPort — inline — hecho (RED→GREEN 8/8), commit e5b99e8
T2 (S2) Store de sesión — inline — hecho (RED→GREEN 6/6), commit e640fec
T3 (S3) Pantallas de login y registro — inline — hecho (RED→GREEN 7/7), commit b9d8922
T4 (S4) Guard de rutas — inline — hecho (RED→GREEN 8/8), commit 0651e79
T5 (S5) Pantalla de perfil — inline — hecho (RED→GREEN 6/6), commit cdc9a56
T6 (S6) Conectar el menú de usuario — inline — TODO

## Log

L1 (2026-10-16) Usuario: "Registra el plan en un md y luego comencemos con la etapa 2" — roadmap registrado como `odd/tasks/trading-platform-frontend.md`; comenzando la Etapa 2 (seam de identidad + login).

L2 (2026-10-16) T1 implementado. `src/shared/api/authPort.ts` + `authPort.test.ts`. Nota de diseño: a diferencia de `wishersPort`/`offersPort` (que devuelven listas vacías honestas), `localAuthPort` RECHAZA `login`/`register`/`updateProfile` con un `AuthUnavailableError` tipado en vez de fabricar un usuario — porque una sesión falsa parecería "perder" el login al recargar. `session()` devuelve `null`, `logout()` es no-op. `mockAuthPort` mantiene un usuario a nivel de módulo para que login/session/logout/updateProfile se lean como un flujo coherente. 8/8 verde. Commiteado como e5b99e8 en `feature/trading-identity` (creada off `dev` actualizado tras el PR #17).

L3 (2026-10-17) T2 implementado. `src/features/auth/state/sessionStore.ts` + test. Nota de diseño: el store NO se persiste deliberadamente — la fuente de verdad es el puerto auth (cookie en el backend, `null` localmente), así que arranca con `authPort.session()` en cada carga en vez de confiar en una copia vieja de localStorage. `signOut` limpia el usuario local primero (un fallo del puerto nunca deja al usuario trabado en una UI de sesión iniciada) y luego delega en `authPort.logout()`, cuya negación aún se propaga. 6/6 verde; suite completa 208/208, build OK, oxlint exit=0. Commiteado como e640fec.

L4 (2026-10-17) T3 implementado. `src/features/auth/authSchemas.ts` (reglas de email/contraseña compartidas para que login y registro no diverjan; la fortaleza de la contraseña más allá de la presencia queda como contrato del backend), `LoginPage.tsx`, `RegisterPage.tsx` + tests, dos rutas hijas en `src/app/router.tsx` (lazy, para no meter react-hook-form en el bundle principal), estilos `.auth-*` en `src/index.css`. Decisiones: la copy sigue el tuteo existente del app ("Ingresa", "Crea una cuenta" — igual que "Agrega" en BinderPage); éxito = `signIn(user)` + navegar a `/`; `AuthUnavailableError` muestra una alerta honesta de "backend no conectado" en vez de un error de credenciales falso. 7/7 tests nuevos verdes; suite completa 215/215, build OK, oxlint exit=0. Commiteado como b9d8922.

L5 (2026-10-17) Decisión de S4 resuelta por el usuario (selección única, opción recomendada primero): eligió **"Exigir sesión solo si hay auth"** por sobre "Redirect duro siempre" y "Sin redirects en esta etapa". Implementado: `available: boolean` agregado al seam `AuthPort` (local `false`, mock `true`); `RequireSession` envolviendo las rutas de binder, detalle y deseos — redirect a `/login` solo cuando `authPort.available && user === null`, fallback de ruta mientras `loading`, nunca adivinar con una sesión sin resolver; `bootstrap()` conectado una sola vez en `AppLayout`. El detalle de carta va dentro del guard (misma data de colección que el binder). 8/8 tests nuevos verdes; suite completa 221/221, build OK, oxlint exit=0. Commiteado como 0651e79. La evaluación nativa de review para este diff devolvió `risk: high` (`review_due_reason: high_risk`) pero también `unassessable`: el runtime `opencode v2.0.27` no tiene la declaración relay del plugin V2 administrado, así que el review nativo por recibo no está disponible en este runtime — resultado tipado preservado, modo sin tocar (es del usuario), aplica en su lugar el gate de verificación independiente. Corrección (blocker hallado por la verificación independiente, resuelta en 3c11398): el `write` de T4 sobre `src/app/layout.test.tsx` había pisado el archivo preexistente y borrado los tests "AppLayout notifications" y "AppLayout locale switch", que S4 nunca pidió quitar — ambos restaurados textual desde 578f867 junto al nuevo describe de bootstrap; recheck 3/3 verde en el archivo.

L6 (2026-10-17) T5 implementado. `ProfilePage.tsx` + test, ruta lazy `/profile` bajo `RequireSession`, `profileSchema` agregado a `authSchemas.ts`, estilos `.auth-form-success`/`.auth-readonly`. Decisiones de diseño: `profileSchema.displayName` replica la regla de `registerSchema` pero es deliberadamente un contrato separado (diff solo aditivo — ninguna línea de schema existente tocada; ambos mensajes están fijados por los tests de sus páginas), así registro y edición de perfil pueden divergir más adelante sin arrastrarse; el email se muestra read-only porque la identidad no es un campo de perfil (`updateProfile` no tiene parámetro de email); un avatar URL vacío se transforma en `undefined` para calzar con `User.avatarUrl?`; una instalación local sin sesión recibe un camino honesto hacia el login en vez de un formulario; el éxito muestra una confirmación inline `role="status"` ("Perfil actualizado") en vez de un toast — una acción de formulario se anuncia inline para tecnología asistiva. 6/6 tests nuevos verdes; suite completa 229/229, build OK, oxlint exit=0. Riesgo: ninguno (pantalla, export de schema, ruta y estilos aditivos — sin modificar comportamiento existente). Commiteado como cdc9a56.
