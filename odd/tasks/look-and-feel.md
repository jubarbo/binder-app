# Feature: look-and-feel — binder-app

## Objective

Polish the visual identity of binder-app without changing behavior: refine the design tokens,
add shared control styles, bring the AddCard dialog, the wants page, the binder board and the
card-detail route up to one consistent, tactile, accessibility-aware visual standard. Direction:
**A — polish** (keep the current violet accent and light/dark system; no thematic redesign).

## Problem

The functionality is complete (code-review-fixes is closed), but the UI is uneven: no radius/
focus/transition tokens, no shared button or field styles, the wants page and the AddCard status
messages are unstyled, the binder board has no hover/paging delight, the card-detail route has no
back navigation or layout, and there is no `:focus-visible` anywhere.

## Why

A tactile binder app lives and dies by its look and feel. Consistent tokens and states make the
app feel finished, improve keyboard/focus usability, and keep both themes (light/dark) and
`prefers-reduced-motion` intact at zero new dependencies.

## Scope (in)

- WU-1 Design foundations: radius, focus, transition and success tokens; `:focus-visible` rule;
  `font: inherit` for form controls.
- WU-2 Shared controls: `.btn` (default/primary/ghost) and `.field`/`.field-error`; applied to the
  wants toggle, `WantEntryForm` (replaces `.add-card-input` reuse, styles `.want-form`) and the
  binder empty-state button.
- WU-3 AddCard dialog: style `.add-card-status` (+`--error`), result items with type-line meta,
  dialog radius/shadow, actions as `.btn`.
- WU-4 Binder hero: board gradient + inset shadow, pocket groove, card hover (shadow/brightness,
  no transform clash with the 3D tilt), focus ring, page-change fade/slide + light item stagger
  (reduced-motion aware), quantity badge polish.
- WU-5 Card detail: "Volver al binder" link, two-column layout on wide screens, image + metadata
  card styling.
- WU-6 Wants list: replace inline styles with `.wants-list`/`.want-item`, styled empty state.

## Constraints

- Zero new dependencies (no fonts, no UI kits).
- Both `prefers-color-scheme` themes and `prefers-reduced-motion` must keep working.
- English code/comments/class names; Spanish neutral UI copy (existing copy unchanged except where
  the plan adds navigation labels).
- No behavior changes beyond presentation; existing tests must keep passing; new a11y/markup
  additions get behavior-first tests where meaningful.
- User approves each commit before it is created; one work unit = one commit.

## Tasks

- [ ] **WU-1 Design foundations**: tokens (`--radius-sm/md/lg`, `--color-focus`, `--transition-*`,
      `--color-success`), global `:focus-visible`, `font: inherit` for controls. Verified build/lint/tests.
- [ ] **WU-2 Shared controls**: `.btn`/`.btn--primary`/`.btn--ghost`, `.field`/`.field-error`,
      `.want-form`; applied to WantsPage toggle, WantEntryForm (errors get `role="alert"`),
      binder-empty button.
- [ ] **WU-3 AddCard dialog**: `.add-card-status` (+error), result-item meta line, dialog radius/
      shadow, `.btn` actions.
- [ ] **WU-4 Binder hero**: board, pockets, card hover + focus, page transition + stagger
      (reduced-motion aware), badge.
- [ ] **WU-5 Card detail**: back link to `/`, two-column layout, card styling.
- [ ] **WU-6 Wants list**: real classes instead of inline styles, styled empty state.

## Authorized scope

`src/index.css`, `src/app/layout.tsx`, `src/features/*` (markup-level class changes only),
`src/app/router.tsx` (none expected), `odd/tasks/look-and-feel.md`. No new dependencies.

## Acceptance criteria

- `npm run build`, `npx oxlint`, `npx vitest run` pass after each work unit.
- `:focus-visible` works; both themes and reduced-motion preserved.
- No inline styles remain in `WantsPage.tsx`; no unstyled surfaces remain in the app.
- Every work unit is one reviewable commit on `feature/look-and-feel` approved by the user.

## Checks

- `npm run build`, `npx oxlint`, `npx vitest run`.
- Native review (`gentle-ai review assess --cwd . --agent opencode --base-ref <reviewed boundary> --committed-only --json`) per commit when enabled (CSS-only candidates are expected passive; the consent/v3 runtime blocker from code-review-fixes still applies to medium/high).

## Delivery

- Branch: `feature/look-and-feel` (created from the `feature/code-review-fixes` tip at `aa75873`,
  which will merge to `dev` first; no git remote/`gh` yet, so PRs stay deferred).
- Commits: one per WU, conventional messages (`style(...)`/`feat(style)`), created only after user approval.

## Route declaration

- All WU: direct inline — single-owner aesthetic/CSS work, mostly one file (`src/index.css`) plus
  small mechanical markup class swaps; no parallel writers; delegation triggers not fired
  (no 2+ non-trivial files per unit).

## Status

- Branch `feature/look-and-feel` from code-review-fixes tip. `.codegraph/` added to `.gitignore`
  (`2b0f31c`) so `git`/`review assess` are clean.
- WU-1..WU-6 pending.