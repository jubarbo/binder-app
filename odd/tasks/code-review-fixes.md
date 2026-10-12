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
- [x] **N3 i18n -> Spanish**: normalize ALL user-facing UI copy to neutral Spanish.
      — Done: all visible text, `aria-label`, placeholder and `alt` copy translated (BinderPage
      empty/sample/nav copy, CardSlot loading/error + quantity, Card3D label/"Sin imagen", CardDetail
      "Para intercambio", WantsPage/WantEntryForm). Glossary: keep "Binder" (brand); "Wants" ->
      "Deseos", "trade" -> "intercambio"; `index.html` `lang="es"` + title "Binder". Data values
      (`language: 'en'`, Scryfall queries) untouched. Writer evidence: RED->GREEN; `npm run build` OK,
      `npx oxlint` clean, `npx vitest run` 5 files / 12 tests; grep shows no English UI copy left.
      Working tree, pending commit.
- [x] **D2 Remove T2 sample loader**: `SAMPLE_CARDS`, `resolveSamplePrintingId`, `loadSampleCards`,
      and the "Load sample cards" empty-state action.
      — Done: sample loader, dev button/note, `SampleCard` and now-unused imports removed from
      `BinderPage.tsx`; dead `.binder-dev-action`/`.binder-dev-note` CSS dropped (accent styling
      preserved as `.binder-empty button`); stale "3x3" page comment fixed to "5x3".
- [x] **D1b Remove remaining dead code**: `binderPort.ts` + `localBinderAdapter.ts` (never consumed;
      duplicate persistence) and unused `CONDITIONS`/`WANT_PRIORITIES`.
      — Done (option (a), user-chosen): review was partly wrong — `binderPort.ts` was NOT unconsumed
      (`binderStore.ts` imported `BINDER_STORAGE_KEY`/`BINDER_STORAGE_VERSION` from it, and AGENTS.md
      named it as the persistence boundary). Removed the ambiguous half-state instead: deleted
      `binderPort.ts` + `localBinderAdapter.ts`, inlined the two constants into `binderStore.ts`,
      dropped unused `CONDITIONS`/`WANT_PRIORITIES` (`Condition`/`WantPriority` types kept), and
      updated `AGENTS.md` + `tactile-binder.md` so neither still presents `BinderPort` as the seam.
      The `CatalogPort` seam stays (it is wired via `scryfallClient`).
- [x] **B4 Empty-state add-card is a no-op** (discovered during D2): the empty branch in
      `BinderPage.tsx` returns early and never renders `{showAdd && <AddCard/>}` (only the non-empty
      branch does), so "Agregar carta" with an empty binder opens nothing — a first-run dead end.
      Pre-existing. Fix: render `AddCard` from the empty branch too (its own commit).
      — Done: `BinderPage.tsx` renders a shared `addCardModal` from both branches; new
      behavior-first test `opens the add-card dialog from the empty state` (observed RED → GREEN).
- [x] **G1 Reconcile feature doc with reality**: decided — dnd-kit dropped (N2), `CardDetail` kept
      and wired (N1); add-card flight animation remains open.
- [x] **C3 Stale comment**: `SLOTS_PER_PAGE = 15` comment says "3x3 page" but the grid is 5 columns.
      — Done: commit `7e7239c`.
- [x] **A1 Overlay accessibility**: Escape-to-close, focus handling, `aria-modal` for `AddCard` and the
      `CardDetail` modal; keyboard activation (Enter/Space) for the `Card3D` card button (the old
      `Card3D` zoom overlay was removed in N1).
      — Done (re-scoped): the `CardDetail` modal part was stale (N1 made it a route, no modal).
      `AddCard` panel is now `role="dialog"` + `aria-modal` + `aria-labelledby` (`useId`), Escape
      closes, focus moves into the search input on mount and is restored to the trigger on unmount;
      `Card3D` root gained an `onKeyDown` for Enter/Space. New `AddCard.test.tsx` (4 tests) and 3
      tests in `Card3D.test.tsx` (observed RED → GREEN). Tab focus-trap left as a follow-up (out of
      scope; jsdom cannot test it).
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
- N3 (i18n -> Spanish) committed `4cac989`.
- D2 (T2 sample loader) + D1b (dead binder port, option (a)) committed `0164c31`; build / oxlint /
  vitest green (5 files, 12 tests); grep proves zero references to the deleted modules/symbols.
- B4 (empty-state "Agregar carta" was a no-op, pre-existing) committed `0e96fec`; +1 test
  (RED → GREEN).
- A1 (AddCard dialog a11y + Card3D keyboard, re-scoped) complete in the working tree,
  **pending user-approved commit**; +7 tests (RED → GREEN); build / oxlint / vitest green
  (6 files, 20 tests).
- RDD (base `b6f6e14`): candidate medium, review_due=true (`slice_budget_reached`). Review
  **blocked**: the `consent/v3` envelope cannot be presented (no native question UI in this runtime).
  Gate pending resolution by the user.
- Next: commit A1, then P1 (perf polish).
