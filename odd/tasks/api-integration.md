# api-integration

Objective: binder-app talks to binder-api in production (auth, catalog, matching, server-owned binder) and deploys on Railway next to it.
Branch: `feature/api-integration` (from `feature/trading-identity`). Delivery: ask-on-risk. Test runner: `npx vitest run`, plus `npm run build` and `npx oxlint`.

## Specs

- S1. HTTP adapters for binder-api, selected when `VITE_API_URL` is set (e.g. `https://api.mantisuy.com/api/v1`). Every request sends `credentials: 'include'`. API errors (`{ "error": { "message", "code", "status" } }`) map to the app's existing error classes. Dev mocks (`VITE_MOCK_*`) keep precedence in dev; without `VITE_API_URL`, behavior is unchanged.
- S2. Auth: `authPort` backed by `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /users/me` (401 = signed out), `PATCH /users/me`; `available: true`.
- S3. Catalog: consumers go through a `catalogPort` binding; the API adapter uses `/catalog/search?q=&locale=`, `/catalog/cards/:name?locale=`, `/catalog/printings/:id`, `/catalog/oracles/:oracleId/printings` (responses already match `OracleCard`/`Printing`).
- S4. Matching: `wishersPort` and `offersPort` backed by `GET /match/wishers/:oracleId` and `GET /match/offers/:oracleId`.
- S5. User decision (L2): "Servidor al iniciar sesión" — "Con sesión, la carpeta y los deseos se leen y escriben en la API. En el primer login se ofrece importar lo que haya en localStorage (POST /binder/import). Sin sesión sigue funcionando en local como hoy. El matching funciona de verdad."
- S6. Deploy: the app builds and serves as a static SPA on Railway (deep links fall back to `index.html`); README documents the variables and steps.
- Out of scope: trade proposals (`tradesPort`) have no API endpoints yet and stay on their current binding.

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1, S2 | inline | done (RED->GREEN) | 5fd2c29 |
| T2 | S1, S3, S4 | inline | done (RED->GREEN) | 10c0348 |
| T3 | S5 | inline | done (RED->GREEN) | ab8fa31 |
| T4 | S6 | inline | done (smoke: serve 200, VITE_API_URL inlined) | 65476e1 |

Route evidence: one parent session, units share `apiClient`; no Writer trigger (no parallel disjoint units, context under backstop).

## Log

- L1 (2026-10-31, user): "ah bien, sí, haz los cambios necesarios en los repos para desplegar, luego dame una guía resumida para hacerlo, ademas de cuando se corre por primera vez el script"
- L2 (2026-10-31, user answer): "Servidor al iniciar sesión (Recommended)".
- L3: binder-api side done on `feat/deploy-railway` (commit 8cd22e1): railway.toml, `npm start` without `.env`, `HOST` `::` in production, catalog sync on first boot.
- L4: T1-T4 done. Suite 306/306, `tsc -b` clean, oxlint only the pre-existing WantEntryForm warning. The LoginPage 401 / RegisterPage 409 tests were written after the message change (no observed RED for those two).
- L5: Conflict noted, not changed: trading-identity L5 requires a session on collection routes whenever auth is available, so with `VITE_API_URL` there is no signed-out guest mode; S5's "Sin sesión sigue funcionando en local" holds only for builds without the API. Guest data saved before deploy is offered for import on first sign-in.
- L6: Router is `createHashRouter`, so static hosting needs no SPA rewrite.
- L7: Independent verifier: S1-S6 pass, no blockers, 7 advisories. Native review (risk, resilience, reliability) approved and acknowledged (lineage review-b3a63dd9884826ef, authority burned), 10 non-blocking findings.
- L8: Verifier advisory 1 fixed in a0f3241 (RED->GREEN): `id_taken` means the id belongs to another account, so it no longer allows removing the guest copy. Assess: medium, under_budget. Suite 307/307.
- Follow-ups (not done): success message when the import succeeds but the reload fails; generation check in `importLocalBinder`; spurious toast for writes in flight at sign-out; writes go to the guest copy when the server load fails on sign-in; quantity above 9999 is rejected by the API; Pages workflow still deploys on push to `main`.
