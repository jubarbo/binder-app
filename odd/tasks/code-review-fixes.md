# Feature: code-review-fixes — binder-app

## Objective

Resolve every finding from the read-only code review of binder-app: real bugs, dead code,
doc/reality drift, i18n and architecture consistency, accessibility, and performance. Deliver the
fixes as reviewable work units on `feature/code-review-fixes`, one commit per section, with the
user approving each commit before it is created.

## Problem

The T1–T6 tactile-binder build passes `build`/`oxlint`/`vitest`, but the review found: an invalid
`WantPriority` write hidden by `as any`, an undebounced Scryfall search, a duplicate flat user nav,
dead modules and an unused dependency, a stale dev sample loader in production, mixed ES/EN UI copy,
a test-only path alias, missing keyboard support on overlays, and unhandled search error/empty states.

## Why

These are correctness, hygiene, and UX-quality issues that would compound as the app grows. The
oracle/printing split and the `CatalogPort`/`BinderPort` seams are the intended architecture, so
unused seams must be wired or removed deliberately, not left as ambiguous half-state.

## Scope (in)

- Fix the `WantPriority` value and remove `any` casts in the wants form.
- Debounce the add-card search.
- Replace the duplicated flat user nav with a real dropdown user menu.
- Wire `CardDetail` into the binder (it is currently dead code).
- Remove `@dnd-kit` (unused dependency) from the codebase and from AGENTS.md.
- Replace all relative imports with the `@/` alias.
- Normalize ALL user-facing UI copy to Spanish.
- Remove the T2 dev sample loader scaffolding and the remaining dead modules.
- Fix the stale `SLOTS_PER_PAGE` comment.
- Add Escape/focus handling to overlays.
- Handle search error/empty states; sort/limit printing lists; optional route code-splitting.

## Constraints

- React 19 + Vite + TS 6; no backend, no auth.
- Code, comments, identifiers, and commit messages in English; user-facing UI copy in neutral Spanish
  (explicit user request).
- No new dependencies without justification; keep behavior-first tests.
- The user must approve each commit before it is created.

## Tasks

- [x] **B1 Fix invalid WantPriority + remove `any`**: `WantEntryForm.tsx` writes `priority: 'medium'`
      (`WantPriority` = `'low' | 'normal' | 'high'`); type the form from the zod schema and drop casts.
      — Done: priority is now `'normal'`; all `as any` removed, form typed via `z.input`/`z.output`;
      added `WantEntryForm.test.tsx` (observed RED → GREEN).
- [x] **B2 Debounce add-card search**: `AddCard.tsx` fires one Scryfall request per keystroke
      (~10 req/s limit); add a debounced value and wire it to `useSearchCards`.
      — Done: `src/shared/hooks/useDebouncedValue.ts` (300 ms) wired into `AddCard`; input stays raw.
- [x] **B3 Real user-menu dropdown**: `layout.tsx` duplicates Binder/Wants in a second flat nav and
      "Mi cuenta" is a non-interactive `<span>`; make one dropdown menu with Mi cuenta, Binder,
      Wants, Cerrar sesión.
      — Done: single accessible dropdown with a hamburger trigger (`aria-haspopup`/`aria-expanded`,
      `role="menu"`/`menuitem`, Escape/outside-click/item-activation close); token-based CSS.
- [ ] **N2 Drop dnd-kit**: remove the `@dnd-kit/*` dependencies (zero imports) and the
      drag-and-drop row from `AGENTS.md`; note in `tactile-binder.md` that dnd-kit is not used.
- [ ] **N4 Path alias `@/`**: add the alias to `vite.config.ts` and `tsconfig.app.json` (`paths`) and
      replace every relative import under `src/` with `@/...`.
- [ ] **N1 Wire CardDetail**: open the card detail modal from a binder card, passing the resolved
      printing; remove `CardDetail.tsx` from the dead-code list.
- [ ] **N3 i18n -> Spanish**: normalize ALL user-facing UI copy to neutral Spanish.
- [ ] **D2 Remove T2 sample loader**: `SAMPLE_CARDS`, `resolveSamplePrintingId`, `loadSampleCards`,
      and the "Load sample cards" empty-state action.
- [ ] **D1b Remove remaining dead code**: `binderPort.ts` + `localBinderAdapter.ts` (never consumed;
      duplicate persistence) and unused `CONDITIONS`/`WANT_PRIORITIES`.
- [x] **G1 Reconcile feature doc with reality**: decided — dnd-kit dropped (N2), `CardDetail` kept
      and wired (N1); add-card flight animation remains open.
- [ ] **C3 Stale comment**: `SLOTS_PER_PAGE = 15` comment says "3x3 page" but the grid is 5 columns.
- [ ] **A1 Overlay accessibility**: Escape-to-close, focus handling, `aria-modal` for `AddCard` and the
      `Card3D` zoom overlay.
- [ ] **P1 Data/perf polish**: search error/empty UI, sort/limit printing lists, optional route
      code-splitting for the >500 kB bundle.

## Authorized scope

Directories `src/app`, `src/shared/api`, `src/shared/types`, `src/features/*`, top-level entry files
and `src/index.css`, `vite.config.ts`, `package.json` inside `binder-app/` only.

## Acceptance criteria

- `npm run build`, `npx oxlint`, and `npx vitest run` all pass.
- No invalid domain values are written (types align with `mtg.ts`).
- Each section is one reviewable work-unit commit on `feature/code-review-fixes`, approved by the user.
- `BinderEntry` still references `printingId`; `WantEntry` still references `oracleId`.

## Checks

- `npm run build` (tsc -b && vite build)
- `npx oxlint`
- `npx vitest run`
- Native review (`gentle-ai review assess`) per work-unit commit when enabled.

## Delivery

- Strategy: `ask-on-risk` (default).
- Branch: `feature/code-review-fixes` (base `dev`).
- Commits: one per section, created only after user approval.

## Route declaration

- B1/B2/B3: delegated direct (writer trigger: 2+ non-trivial files).
- N2: inline (mechanical: dependency removal + doc edit).
- N1/N3/N4: delegated direct.

## Status

- Branch `feature/code-review-fixes` from `dev` at `b6f6e14`.
- Section 1 (B1–B3) committed `8456547`; AGENTS.md translation committed `ce02476`.
- RDD assess (base `b6f6e14`): medium, `review_due=false` (`under_budget`).
- Next: N2 (drop dnd-kit), N4 (alias), N1 (CardDetail), N3 (Spanish i18n).
