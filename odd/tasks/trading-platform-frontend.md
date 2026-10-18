# Trading platform — frontend roadmap

Objective: grow binder-app's frontend from a single-user local collection manager into the trading-platform surface (identity, tradeable curation, match actions, trade workflow), ahead of the `binder-api` backend.

Governing principle: every stage builds against **ports with local/mock implementations** (the existing `CatalogPort` / `WishersPort` / `OffersPort` pattern), so the frontend grows now without waiting for the backend; when `binder-api` exists, only the adapter binding swaps, no consumer changes.

The `binder-api` backend has its own phased plan (`binder-api/docs/api-plan.md` §8). It appears here only as a **dependency**, not re-planned.

Status: stages 1–3 delivered on feature/trading-identity (2026-10-18); stages 4–5 pending. Written: 2026-10-16.

## Stages and dependency chain

```
Stage 1 (forTrade toggle) ─┐
                           ├─→ Stage 3 (match actions) ─→ Stage 4 (trade workflow)
Stage 2 (identity) ────────┘                                    │
                                                                └─→ Stage 5 (migration + public binder) [needs real backend]
```

| # | Stage | Value | Works without backend? |
|---|-------|-------|------------------------|
| 1 | Toggle `forTrade` | The trading lever | Yes, fully (client state) |
| 2 | Identity seam + login | The dead menu becomes real | Against mock |
| 3 | Match actions | Display → trading | Against mock |
| 4 | Trade workflow | The trading itself | Against mock (real logic: backend) |
| 5 | Migration + public binder | Connective tissue | No — needs real backend |

## Stage 1 — Toggle forTrade

Scope: wire `toggleForTrade` (already in `binderStore.ts`) to a real control in `CardDetail` edit mode; extend the `onSaveDetails` patch to carry `forTrade` only when the control actually changed it (mirroring how `finish` rides along only on change); RED→GREEN test plus a regression test that editing notes alone does not rewrite `forTrade`.

Deliverable: users can curate tradeable cards; `WhoWants`/`WhoHas` start to mean something because `for_trade` stops being a permanent `true`.

Mock/real: 100% real, pure client state, no backend dependency.

Delivered: 2026-10-17 on feature/trading-identity. The control is a "Para intercambio" checkbox in `CardDetail` edit mode that rides the `onSaveDetails` patch (store action `updateEntryDetails` widened to `forTrade?: boolean`); the scope's conditional-carry mechanism supersedes wiring `toggleForTrade` directly, which stays in the store as the lever for the future grid quick action. Open decision resolved: detail-only for now. Tests: 4 new in `CardDetailPage.test.tsx` (seeded checkbox, mark, unmark, and the notes-only regression pinning that the patch omits `forTrade` when untouched).

## Stage 2 — Identity seam + login

Scope: an `AuthPort` seam (`session` / `login` / `register` / `logout` / `updateProfile`) + `User` type, with local/mock/binding; a session store (zustand) that bootstraps via `authPort.session()`; login/register screens + routes; a route guard (binder/wants require a session); a profile screen (`displayName` + `avatarUrl`); wire the dead "Mi cuenta" → profile and "Cerrar sesión" → `logout()`.

Mock/real: the UI and flow work against mock; the real cookie (`httpOnly`) and `GET /users/me` wait for the backend.

Backend dependency: auth endpoints + the same-site hosting constraint (api-plan §6.3).

Open decision: guard behavior for pre-existing `localStorage` data when unauthenticated (the migration itself is Stage 5).

## Stage 3 — Match actions

Scope: an action from each wisher/offerer in `WhoWants`/`WhoHas` ("proponer trade", later "contactar"); a `TradesPort` (`proposeTrade` / `myTradePairs` / `respondTrade`) with local/mock; a minimal "I offer X for Y" panel opened from a match.

Dependencies: Stage 2 (who is proposing) + Stage 1 (what is tradeable).

Resolved (2026-10-17, user choice): bidirectional inline selection ("give this / ask this") — no cart; a cart's value depends on the Stage 5 public binder. Spec: `odd/tasks/trade-proposal.md`.

## Stage 4 — Trade workflow

Scope: a "Mis trades" screen (pending sent/received, accept/decline); trade pairs (`findTradePairs`) — the "what I have you want / what you have I want" view; closed-trade history; loading/empty/error states on each.

Mock/real: structure and UI real; pair resolution and real trade states wait for the backend.

Open decision: history granularity and which trade states to model (the backend plan defers this to phase 4).

## Stage 5 — Migration + public binder (needs real backend)

Scope: local→server migration (upload the `localStorage` binder/wants to a new account); a public/shareable binder route; export/import JSON as a safety net and portability aid (no longer the primary backup once the server owns the data).

Dependency: real backend + users. This is the one stage that cannot be built against mocks.

## Governing conventions (every stage)

- Ports with local/mock/binding (the `WishersPort`/`OffersPort` pattern); production resolves to the honest local port.
- RED→GREEN tests per behavior (`npx vitest run`); verify `npm run build` + `npx oxlint`.
- Error shape `CatalogError { status, code, message }`.
- Conventional commits, no AI attribution. Artifacts (code, docs, UI copy) in English.

## Log

- L1 (2026-10-16): plan registered from the chat discussion; user chose httpOnly-cookie auth (recorded in `binder-api` plan) and asked to begin with Stage 2.
- L2 (2026-10-17): Stage 1 delivered (for-trade toggle, commit f97e47c) and the Stage 3 composition-UX decision resolved to inline bidirectional selection; Stage 3 moved into `odd/tasks/trade-proposal.md`.
- L3 (2026-10-18): Stage 3 delivered (TradesPort seam, proposal panel and match entry points; commits f32e330, 1e06378, 4d0bd36; detail in `odd/tasks/trade-proposal.md`). Stage 4's open decision (trade-history granularity and states) is next.
