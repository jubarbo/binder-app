# Feature: trading identity (Stage 2 of the trading-platform frontend roadmap)

Objective: give binder-app a real notion of "who am I" — an auth seam, a session store, login/register, a route guard, a profile, and the dead "Mi cuenta"/"Cerrar sesión" menu made real. Builds entirely against a mock auth port so it does not wait for `binder-api`.

Roadmap context: `odd/tasks/trading-platform-frontend.md`, Stage 2.
Branch: TBD — recommend a fresh `feature/*` off `dev`; the current `feature/catalog-locale-search` already holds unmerged locale/DFC/wants work.
Delivery: work-unit commits per task. Test runner: `npx vitest run`; verify `npm run build` + `npx oxlint`.

## Specs

S1 — AuthPort seam. Create `src/shared/api/authPort.ts`: a `User` type `{ id, email, displayName, avatarUrl? }`; an `AuthPort` interface with `session(signal?)`, `login(email, password, signal?)`, `register(email, password, displayName, signal?)`, `logout(signal?)`, `updateProfile({ displayName?, avatarUrl? }, signal?)`. Provide `localAuthPort` (honest no-backend: `session` → `null`; `login`/`register`/`updateProfile` reject with a typed `AuthUnavailableError`; `logout` resolves as a no-op), `mockAuthPort` (gated behind `DEV && VITE_MOCK_AUTH === '1'`, holds a module-level mock user so login/session/logout/updateProfile behave as one coherent fake flow), and the `authPort` binding. Mirrors the `wishersPort`/`offersPort` pattern exactly.

S2 — Session store. A zustand store exposing the current `User | null` plus setters, bootstrapping on load by calling `authPort.session()`. Consumes the S1 seam; no UI yet.

S3 — Login and register. Screens + routes; submit calls `authPort.login`/`register`; on success store the user and navigate to the binder; on `AuthUnavailableError` show an honest "backend not connected" state.

S4 — Route guard. The binder and wants routes require a session; the guard's behavior for pre-existing `localStorage` data when unauthenticated is decided here (hard redirect vs soft "not signed in" state) so the local-only experience is not broken.

S5 — Profile. A screen to edit `displayName` and `avatarUrl` via `authPort.updateProfile`.

S6 — Wire the menu. "Mi cuenta" navigates to the profile; "Cerrar sesión" calls `authPort.logout()` and clears the session. Both currently render as dead items in `src/app/layout.tsx`.

## Tasks

T1 (S1) AuthPort seam — inline — done (RED→GREEN 8/8), commit e5b99e8
T2 (S2) Session store — inline — done (RED→GREEN 6/6), commit e640fec
T3 (S3) Login and register screens — inline — done (RED→GREEN 7/7), commit b9d8922
T4 (S4) Route guard — inline — TODO
T5 (S5) Profile screen — inline — TODO
T6 (S6) Wire the user menu — inline — TODO

## Log

L1 (2026-10-16) User: "Registra el plan en un md y luego comencemos con la etapa 2" — roadmap registered as `odd/tasks/trading-platform-frontend.md`; beginning Stage 2 (identity seam + login).

L2 (2026-10-16) T1 implemented. `src/shared/api/authPort.ts` + `authPort.test.ts`. Design note: unlike `wishersPort`/`offersPort` (which honestly return empty lists), `localAuthPort` REJECTS `login`/`register`/`updateProfile` with a typed `AuthUnavailableError` instead of fabricating a user — a fake session would appear to "lose" the login on reload. `session()` returns `null`, `logout()` is a no-op. `mockAuthPort` holds a module-level user so login/session/logout/updateProfile read as one coherent flow. 8/8 green. Committed as e5b99e8 on `feature/trading-identity` (branched off updated `dev` after PR #17).

L3 (2026-10-17) T2 implemented. `src/features/auth/state/sessionStore.ts` + test. Design note: the store is deliberately NOT persisted — the source of truth is the auth port (cookie on the backend, `null` locally), so it bootstraps via `authPort.session()` on every load instead of trusting a stale localStorage copy. `signOut` clears the local user first (a failing port call never traps the user in a signed-in UI) then delegates to `authPort.logout()`, whose rejection still propagates. 6/6 green; full suite 208/208, build OK, oxlint exit=0. Committed as e640fec.

L4 (2026-10-17) T3 implemented. `src/features/auth/authSchemas.ts` (shared email/password rules so login and register cannot drift; password beyond presence stays a backend contract), `LoginPage.tsx`, `RegisterPage.tsx` + tests, two child routes in `src/app/router.tsx` (lazy, keeping react-hook-form out of the main bundle), `.auth-*` styles in `src/index.css`. Decisions: UI copy follows the app's existing tuteo ("Ingresa", "Crea una cuenta" — matches "Agrega" in BinderPage); success = `signIn(user)` + navigate to `/`; `AuthUnavailableError` renders an honest "backend not connected" alert instead of a fake credentials error. 7/7 new tests green; full suite 215/215, build OK, oxlint exit=0. Committed as b9d8922.
