# Responsive UI — audit and plan (2026-10-14)

Objective: audit every screen of binder-app against small viewports and lay out a
mobile-first fix plan, one screen per task. The audit was read-only; the
implementation below touched only `src/index.css`. Baseline: `dev@1c26e96`. Delivery
strategy: `ask-on-risk`. All seven tasks were implemented in one pass and committed as
`fb5f77f` (see L3); this document lands right after it as the record (L4).

Verification model: the repo ships no visual-regression tooling, so every spec below is
checked by hand in the dev server at 360 / 390 / 768 / 1280 px wide plus one landscape
check (667×375), together with `npm run build`, `npx oxlint` and `npx vitest run` (147
tests must stay green; CSS-only tasks move none of them).

## Audit facts

- Exactly one width-based media query exists in the whole stylesheet:
  `@media (min-width: 720px)` (src/index.css:1413), for the card-detail grid. Every other
  `@media` is `prefers-color-scheme` (src/index.css:73) or `prefers-reduced-motion`.
- The viewport meta tag is correct (index.html:6).
- All inline styles in TSX are dynamic (glare, card-flight geometry) — no hardcoded
  layout dimensions bypass the stylesheet (src/features/binder/components/CardFlightOverlay.tsx:46).
- The token scale is sane for scaling: rem-based type, root 100% (src/index.css:54-60),
  spacing 4/8/12/16/24/32px (src/index.css:47-53). Nothing to migrate.

## Specs

### S1 — The binder grid is fixed at five columns

`src/index.css:977-984` — `.binder-grid { grid-template-columns: repeat(5, 1fr); }` with
15 pockets per page (`src/features/binder/components/BinderPage.tsx:8`). At a 360px
viewport the math is: 360 − 48 (`.app-main` padding) − 24 (`.binder-page-frame` padding)
− 48 (four 12px gaps) = 288 / 5 ≈ **48×67px pockets** — unreadable art.

Acceptance: at ≤479px the grid renders 3 columns (≥95px pockets); ≥720px keeps the current
5 columns; every pocket keeps `--card-aspect-ratio`; the empty-pocket and add-pocket
shortcuts (`src/index.css:994`, `src/index.css:1012`) keep working at both sizes.

### S2 — The card zoom overflows the viewport on phones

`src/index.css:745-752` — `.zoom-img { height: min(78vh, 520px); width: auto; }` inside
`.zoom-panel { max-width: min(92vw, 420px); padding: 24px; }` (`src/index.css:715-727`).
On a 375×667 phone: 78vh → 520px of height → 372px of width inside a 297px content box.
The image sticks out of the panel (no `max-width` on the image, `overflow` unset on the
panel) — the same failure hits any portrait phone.

Acceptance: at every viewport the image fits inside the panel with its ratio preserved
(`width/height: auto` plus both `max-*` constraints), portrait and landscape, and the
frame keeps hugging the artwork so the foil band stays registered
(src/index.css:735-743).

### S3 — The card-detail label column is a fixed 150px

`src/index.css:1519-1526` — `.card-detail-row { grid-template-columns: 150px 1fr; }`
inside `.card-detail-meta` (24px padding, src/index.css:1508-1517) on a page capped at
420px (`src/index.css:1308-1313`): at 320px the value column collapses to ~62px, so long
oracle text and set names wrap into slivers.

Acceptance: at ≤479px the label column shrinks (`minmax(0, auto)`) or the row stacks;
no clipped or single-character-per-line values; no horizontal scroll.

### S4 — The app nav has no wrapping path

`src/index.css:775-792` — `.app-nav { height: 56px; padding-inline: 24px; }`, a flex row
with brand "Binder" + two links + a 36px menu trigger
(`src/app/layout.tsx:34-48`), `flex-wrap` absent. It totals ~314px at a 320px viewport —
nothing left to spare, and the brand duplicates the "Binder" link.

Acceptance: at ≤479px the bar does not clip (padding reduced and/or brand hidden, or
`min-height` + `flex-wrap: wrap` instead of a fixed `height`); links stay keyboard
reachable and the dropdown (`src/index.css:847-860`) stays inside the viewport.

### S5 — The add-card dialog wastes width and misuses vh

`src/index.css:1333-1351` — `.add-card-modal { padding: 32px; max-height: 80vh; }`. At
360px only ~260px of content width survives the padding, and `80vh` counts the mobile URL
bar, so the dialog can extend past the visible area.

Acceptance: at ≤479px padding drops to 16px; `max-height` is `dvh`-based with a `vh`
fallback so the panel never hides under browser chrome; internal scrolling and
`overscroll-behavior: contain` keep working (`src/index.css:1345-1347`).

### S6 — The wants row gives the thumbnail a quarter of the screen

`src/index.css:1650-1659` — `.want-item-thumb { width: 96px; height: 134px; }` in a flex
row (`.want-item`, `src/index.css:1637-1648`) with a 32px row padding and a nowrap qty
pill (`src/index.css:1716-1726`): ~128px left for the name at 360px.

Acceptance: at ≤479px the thumbnail is 64×89 (same ratio) and the text block keeps the
majority of the row; the absolutely-positioned remove button
(`src/index.css:1661-1682`) stays inside the viewport with a ≥24px target.

### S7 — Global horizontal padding

`src/index.css:884-890` — `.app-main { padding: 24px; }`. Fine on desktop, heavy on a
360px screen where it costs 13% of the width.

Acceptance: at ≤479px the padding is 16px; no screen ever exceeds 100vw.

### S8 — One breakpoint convention, not ad-hoc values

Mobile-first: a `480px` step for phone-specific compaction, the existing `720px` kept as
the tablet/desktop step, and a `1024px` step added only where a real desktop gain exists.
New rules sit in the block of the component they serve; base rules target the small
viewport and `min-width` queries upgrade upward. No `max-width` queries.

Acceptance: every task below lands under this convention, and the convention is written
as a comment at the top of the stylesheet so the next change follows it.

### S9 — Already responsive: do not touch

`.card-detail-grid` three-column upgrade at 720px (src/index.css:1413-1450);
`repeat(auto-fill, minmax(96px, 1fr))` grids for `.image-select-panel`
(src/index.css:375) and `.want-printing-list` (src/index.css:604); `.binder-header`
`flex-wrap: wrap` (src/index.css:915); `.confirm-panel` and `.zoom-panel` capped with
`min(92vw, …)` (src/index.css:1742, src/index.css:719); `.want-item-name`
`overflow-wrap: anywhere` (src/index.css:1696-1699); `.app-shell` already on `100svh`
(src/index.css:757).

### S10 — No new dependency, and how the work is proven

No Tailwind, no CSS-in-JS, no visual-regression package: the app already ships one global
stylesheet with a token scale, and adding a framework for seven CSS tasks would be
disproportionate. Proof per task: the hand checks at the widths listed at the top, plus
`npm run build`, `npx oxlint`, `npx vitest run` all green.

### S11 — Short/landscape viewports

The three overlays centre their panels with `align-items: center`
(`src/index.css:1323-1331`, `src/index.css:702-713`, `src/index.css:1728-1736`). At
667×375 landscape a `max-height` panel must stay fully reachable.

Acceptance: at 667×375 the add-card dialog, the zoom and the confirm dialog all scroll
internally when they do not fit, with no clipped top edge and no page-level horizontal
scroll.

## Tasks (route: inline; no writer trigger — each is one understood CSS change)

| ID | Specs | Task | Status | Commit |
|----|-------|------|--------|--------|
| T1 | S1, S7 | Fluid binder grid (3 columns ≤479px, 5 ≥720px) + `.app-main` padding step | done | fb5f77f |
| T2 | S2 | Make the zoom image fit its panel at every viewport | done | fb5f77f |
| T3 | S3 | Shrink/stack the card-detail label column on phones | done | fb5f77f |
| T4 | S4 | Phone-safe app nav (padding/brand/wrap) | done | fb5f77f |
| T5 | S5, S11 | Add-card dialog: padding step, `dvh` max-height, landscape check | done | fb5f77f |
| T6 | S6 | Wants row: 64×89 thumbnail below 480px | done | fb5f77f |
| T7 | S8, S9, S10 | Breakpoint convention comment + hand verification at 360/390/768/1280 + gates | done | fb5f77f |

## Log

- L1 (2026-10-14, verbatim): "Haz una revisión total de la IU para hacerla responsive. Hazme un plan para eso."
- L2 (2026-10-14): Audit ran inline — the exploration subagent is blocked in this runtime
  ("OpenCode's free tier can only be used from within OpenCode"), so the evidence above
  came from bounded reads of `src/index.css`, `src/app/layout.tsx` and
  `src/features/binder/components/BinderPage.tsx`.
- L3 (2026-10-14, verbatim): "Sí, ejecuta." — All seven tasks implemented in one
  `src/index.css` pass (75 insertions / 14 deletions, no TSX touched, no dependency
  added). Six min-width queries landed, all mobile-first, none of them `max-width`:
  `.app-nav` 720 (min-height + wrap base), `.app-main` 720 (24px padding),
  `.binder-grid` 720 (3 → 5 columns), `.add-card-modal` 720 (32px padding) plus
  `max-height: 80vh → 80dvh` fallback chain, `.card-detail-row` inside the existing
  720 block (stacked label → `150px 1fr`), `.want-item-thumb` at 480 (64×89 → 96×134).
  Zoom fix: `.zoom-frame` gained `max-width: 100%` so the image has a definite
  containing width, and `.zoom-img` went from a fixed `height: min(78vh, 520px)` to
  `width/height: auto` with both `max-*` caps. Verified: `npm run build` ok (CSS parsed
  by Vite), `npx oxlint` 1 pre-existing warning, `npx vitest run` 147/147. The zoom
  empty-src edge was checked and is unreachable: both triggers render only when the
  card carries art (`src/features/wants/components/WantEntryForm.tsx:242`,
  `src/features/binder/components/CardDetail.tsx:73-82`). Still owed by the user: the
  hand check at 360/390/768/1280 in the dev server, and the word to commit.
- L4 (2026-10-14): Committed at the user's word — `fb5f77f feat(ui): mobile-first
  responsive pass across every screen` holds the whole `src/index.css` pass; this
  document follows as its own `docs(odd)` commit. Gates re-run on the committed tree
  before delivery: `npm run build` ok, `npx oxlint` 1 pre-existing warning,
  `npx vitest run` 147/147. Native review assessment over the range stays
  `unassessable` (the same runtime eligibility block as before), so the work is
  recorded as review-unavailable rather than low risk.
