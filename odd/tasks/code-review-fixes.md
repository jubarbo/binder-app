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
- [x] **N2 Drop dnd-kit**: remove the `@dnd-kit/*` dependencies (zero imports) and the
      drag-and-drop row from `AGENTS.md`; note in `tactile-binder.md` that dnd-kit is not used.
      — Done: commit `7e7239c` (package.json/package-lock, AGENTS.md, tactile-binder.md).
- [x] **N4 Path alias `@/`**: add the alias to `vite.config.ts` and `tsconfig.app.json` (`paths`) and
      replace every relative import under `src/` with `@/...`.
      — Done: alias in `vite.config.ts` (`resolve.alias`) and `tsconfig.app.json` (`paths`, no
      `baseUrl` for TS6); all `src/` imports rewritten; `vi.mock` strings updated; `.tsx` extension
      dropped on `@/app/App`. Working tree, pending commit. Checks green: build / oxlint / vitest
      (4 files, 5 tests).
- [x] **N1 Wire CardDetail**: open the card detail from a binder card, passing the resolved
      printing; remove `CardDetail.tsx` from the dead-code list.
      — Done (routed page, per user): route `/card/:entryId` under `AppLayout`; `CardSlot` navigates
      on card click (`useNavigate`) and renders no modal; new container `CardDetailPage` resolves the
      `BinderEntry` from the store and the `Printing` via `usePrinting`, with not-found/loading/error
      states; `CardDetail` is pure presentation (image `imageLarge || imageNormal || imageSmall` +
      Spanish metadata). `Card3D` exposes `onOpenDetail` and the inline zoom was removed (dead CSS
      dropped). Writer evidence: RED→GREEN; `npm run build` OK, `npx oxlint` clean,
      `npx vitest run` 5 files / 12 tests. Working tree, pending commit.
- [ ] **N3 i18n -> Spanish**: normalize ALL user-facing UI copy to neutral Spanish.
- [ ] **D2 Remove T2 sample loader**: `SAMPLE_CARDS`, `resolveSamplePrintingId`, `loadSampleCards`,
      and the "Load sample cards" empty-state action.
- [ ] **D1b Remove remaining dead code**: `binderPort.ts` + `localBinderAdapter.ts` (never consumed;
      duplicate persistence) and unused `CONDITIONS`/`WANT_PRIORITIES`.
- [x] **G1 Reconcile feature doc with reality**: decided — dnd-kit dropped (N2), `CardDetail` kept
      and wired (N1); add-card flight animation remains open.
- [x] **C3 Stale comment**: `SLOTS_PER_PAGE = 15` comment says "3x3 page" but the grid is 5 columns.
      — Done: commit `7e7239c`.
- [ ] **A1 Overlay accessibility**: Escape-to-close, focus handling, `aria-modal` for `AddCard` and the
      `CardDetail` modal; keyboard activation (Enter/Space) for the `Card3D` card button (the old
      `Card3D` zoom overlay was removed in N1).
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

- Strategy: `feature-branch-chain` (chosen after the branch exceeded the ~400-line review budget).
- Deferred: the repo has **no git remote and no `gh`**, so no PR can be opened. Trackers/children are
  not created yet; work-unit commits land directly on `feature/code-review-fixes` for now.
- Chain plan (for when a remote exists): tracker `feature/code-review-fixes` (PR base `dev`) with
  stacked child branches per remaining section (`fixes/crf-01-n1-card-detail`, `fixes/crf-02-n3-i18n`,
  ...).
- Branch: `feature/code-review-fixes` (base `dev`).
- Commits: one per section, created only after user approval.

## Route declaration

- B1/B2/B3: delegated direct (writer trigger: 2+ non-trivial files).
- N2: inline (mechanical: dependency removal + doc edit).
- N1/N3/N4: delegated direct.

## Status

- Branch `feature/code-review-fixes` from `dev` at `b6f6e14`.
- Section 1 (B1–B3) committed `8456547`; AGENTS.md translation `ce02476`; N2 + C3 `7e7239c`.
- N4 (path alias `@/`) committed `3578b41`.
- N1 (wire `CardDetail` as route `/card/:entryId`) committed on `feature/code-review-fixes`;
  build / oxlint / vitest green (5 files, 12 tests).
- RDD assess on `3578b41` (base `b6f6e14`): medium, `review_due=true` (`slice_budget_reached`).
  Review **blocked**: the returned `consent/v3` envelope cannot be presented (no native question UI
  in this runtime). Gate pending resolution by the user.
- Next: commit N1, then N3 (Spanish i18n), D2 (sample loader), D1b (dead code), A1 (overlay a11y),
  P1 (perf polish).
