# Feature: trading identity (Stage 2 of the trading-platform frontend roadmap)

Objective: give binder-app a real notion of "who am I" — an auth seam, a session store, login/register, a route guard, a profile, and the dead "Mi cuenta"/"Cerrar sesión" menu made real. Builds entirely against a mock auth port so it does not wait for `binder-api`.

Roadmap context: `odd/tasks/trading-platform-frontend.md`, Stage 2.
Branch: TBD — recommend a fresh `feature/*` off `dev`; the current `feature/catalog-locale-search` already holds unmerged locale/DFC/wants work.
Delivery: work-unit commits per task. Test runner: `npx vitest run`; verify `npm run build` + `npx oxlint`.

## Specs

S1 — AuthPort seam. Create `src/shared/api/authPort.ts`: a `User` type `{ id, email, displayName, avatarUrl? }`; an `AuthPort` interface with `available: boolean` (whether an auth system backs the port — the route guard asks it before enforcing a session), `session(signal?)`, `login(email, password, signal?)`, `register(email, password, displayName, signal?)`, `logout(signal?)`, `updateProfile({ displayName?, avatarUrl? }, signal?)`. Provide `localAuthPort` (honest no-backend: `session` → `null`; `login`/`register`/`updateProfile` reject with a typed `AuthUnavailableError`; `logout` resolves as a no-op), `mockAuthPort` (gated behind `DEV && VITE_MOCK_AUTH === '1'`, holds a module-level mock user so login/session/logout/updateProfile behave as one coherent fake flow), and the `authPort` binding. Mirrors the `wishersPort`/`offersPort` pattern exactly.

S2 — Session store. A zustand store exposing the current `User | null` plus setters, bootstrapping on load by calling `authPort.session()`. Consumes the S1 seam; no UI yet.

S3 — Login and register. Screens + routes; submit calls `authPort.login`/`register`; on success store the user and navigate to the binder; on `AuthUnavailableError` show an honest "backend not connected" state.

S4 — Route guard. Resolved by user decision (see L5): the guard requires a session only when an auth system backs the app. `RequireSession` wraps the binder, card-detail and wants routes: when `authPort.available` is true and there is no session it redirects to `/login`; on a local-only install (`available === false`) every route stays open, so the local-first experience never bricks. While bootstrapping it holds the current view behind the route fallback instead of guessing. `AppLayout` runs `bootstrap()` exactly once per load. Strict enforcement on every install becomes automatic when the real backend adapter (`available: true`) replaces the binding.

S5 — Profile. A screen to edit `displayName` and `avatarUrl` via `authPort.updateProfile`.

S6 — Wire the menu. "Mi cuenta" navigates to the profile; "Cerrar sesión" calls `authPort.logout()` and clears the session. Both currently render as dead items in `src/app/layout.tsx`.

## Tasks

T1 (S1) AuthPort seam — inline — done (RED→GREEN 8/8), commit e5b99e8
T2 (S2) Session store — inline — done (RED→GREEN 6/6), commit e640fec
T3 (S3) Login and register screens — inline — done (RED→GREEN 7/7), commit b9d8922
T4 (S4) Route guard — inline — done (RED→GREEN 8/8), commit 0651e79
T5 (S5) Profile screen — inline — TODO
T6 (S6) Wire the user menu — inline — TODO

## Log

L1 (2026-10-16) User: "Registra el plan en un md y luego comencemos con la etapa 2" — roadmap registered as `odd/tasks/trading-platform-frontend.md`; beginning Stage 2 (identity seam + login).

L2 (2026-10-16) T1 implemented. `src/shared/api/authPort.ts` + `authPort.test.ts`. Design note: unlike `wishersPort`/`offersPort` (which honestly return empty lists), `localAuthPort` REJECTS `login`/`register`/`updateProfile` with a typed `AuthUnavailableError` instead of fabricating a user — a fake session would appear to "lose" the login on reload. `session()` returns `null`, `logout()` is a no-op. `mockAuthPort` holds a module-level user so login/session/logout/updateProfile read as one coherent flow. 8/8 green. Committed as e5b99e8 on `feature/trading-identity` (branched off updated `dev` after PR #17).

L3 (2026-10-17) T2 implemented. `src/features/auth/state/sessionStore.ts` + test. Design note: the store is deliberately NOT persisted — the source of truth is the auth port (cookie on the backend, `null` locally), so it bootstraps via `authPort.session()` on every load instead of trusting a stale localStorage copy. `signOut` clears the local user first (a failing port call never traps the user in a signed-in UI) then delegates to `authPort.logout()`, whose rejection still propagates. 6/6 green; full suite 208/208, build OK, oxlint exit=0. Committed as e640fec.

L4 (2026-10-17) T3 implemented. `src/features/auth/authSchemas.ts` (shared email/password rules so login and register cannot drift; password beyond presence stays a backend contract), `LoginPage.tsx`, `RegisterPage.tsx` + tests, two child routes in `src/app/router.tsx` (lazy, keeping react-hook-form out of the main bundle), `.auth-*` styles in `src/index.css`. Decisions: UI copy follows the app's existing tuteo ("Ingresa", "Crea una cuenta" — matches "Agrega" in BinderPage); success = `signIn(user)` + navigate to `/`; `AuthUnavailableError` renders an honest "backend not connected" alert instead of a fake credentials error. 7/7 new tests green; full suite 215/215, build OK, oxlint exit=0. Committed as b9d8922.

L5 (2026-10-17) S4 decision resolved by the user (single-select, recommended option first): chose **"Exigir sesión solo si hay auth"** over "Redirect duro siempre" and "Sin redirects en esta etapa". Implemented: `available: boolean` added to the `AuthPort` seam (local `false`, mock `true`); `RequireSession` wrapping the binder, card-detail and wants routes — redirect to `/login` only when `authPort.available && user === null`, route fallback while `loading`, never a guess on an unresolved session; `bootstrap()` wired once in `AppLayout`. Card detail rides inside the guard (same collection data as the binder). 8/8 new tests green; full suite 221/221, build OK, oxlint exit=0. Committed as 0651e79. Native review assessment for this diff returned `risk: high` (`review_due_reason: high_risk`) but also `unassessable`: runtime `opencode v2.0.27` lacks the managed V2 relay declaration, so immutable receipt review is unavailable on this runtime — typed result preserved, mode untouched (user-owned), independent verification gate applies instead. Correction (blocker found by independent verification, fixed in 3c11398): the T4 `write` of `src/app/layout.test.tsx` had overwritten the pre-existing file and deleted the "AppLayout notifications" and "AppLayout locale switch" tests, which S4 never asked to remove — restored both verbatim from 578f867 alongside the new bootstrap describe; recheck 3/3 green in the file.
