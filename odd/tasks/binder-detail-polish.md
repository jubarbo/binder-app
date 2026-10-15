# binder-detail-polish — Desktop layout, zoom, toast, foil motion, finish editing

Five refinements on the binder card detail (plus toast styling): the wanters
section moves into the free right-hand space as a 3-column desktop layout, the
detail image gains the same zoom modal the wants list has, the toast is themed
to the app, the foil band animates continuously, and finish editing is removed
from the detail (quantity and notes only).

Branch: `dev` (work-unit commits; no push/PR unless the user asks).
Delivery: `ask-on-risk`. Forecast ~600 authored lines across 5 tasks.
Test runner: `npx vitest run`. Gates: `npx tsc -b`, `npx oxlint`, `npm run build`.
Execution order: T1 (S5) → T2 (S1) → T3 (S2) → T4 (S4) → T5 (S3).

## Specs

### S1 — Wanters section in the right-hand space, 3 columns on desktop

> "Estamos en la vista desktop, en el detalle de la carta del binder mueve la sección de deseantes al espacio que tenemos a la derecha de la pantalla. En esta sección el diseño en desktop debería ser de 3 columnas."

`.card-detail-page` is capped at `max-width: 420px` inside an `.app-main` of
1100px, so ~680px sit unused on the right while the metadata column collapses
to roughly 140px. On desktop (≥720px) the detail page uses the full content
width and `.card-detail-grid` becomes three columns:
`minmax(280px, 420px) | 1fr | minmax(260px, 340px)` — media, metadata, wanters.
The four grid children get explicit placement (media col 1 row 1, meta col 2
row 1, edit col 2 row 2, `.wanters` col 3 spanning rows 1-2); explicit
placement is required because implicit auto-flow would drop the fourth child
into row 2 and leave a hole at the top right. `.wanters-list` becomes a
3-column grid on desktop with **avatar plus visible name per cell** (assumption
stated to the user: three bare circles per row communicate nothing; a bare
avatar layout is offered as the alternative). The current
`grid-column: 1 / -1` is removed.

Acceptance: on desktop the wanters panel occupies the third column next to the
metadata; its list is 3 columns; on mobile nothing changes.

### S2 — Zoom modal on the detail image

> "Ya tenemos el efecto 3D en el hover de la carta en el detalle de la carta en el binder. Ahora agreguemos la misma funcionalidad de zoom con modal que tenemos en el buscador en la sección lista de deseos."

Same pattern as `ConfirmDialog`: a shared `src/shared/components/CardZoom.tsx`
(portal to `document.body`, semi-opaque scrim with `cursor: zoom-out`, Escape,
scrim click and the "Cerrar" button close it, focus moves in and is restored,
`AnimatePresence` for the exit). `WantCardZoom` becomes a thin wrapper keeping
its copy (`card.name`, `typeLine`, "Cerrar") so the wants tests keep passing.
In the detail, clicking the enlarged image opens the zoom with
`imageLarge || imageNormal || imageSmall` and the title
`setName #collectorNumber` (the `Printing` model has no card name — known from
the previous feature). Keyboard: `role="button"`, `tabIndex=0`, Enter/Space,
matching `Card3D`.

Acceptance: click opens the dialog with the large image; Escape, the scrim and
"Cerrar" close it; focus returns to the image; the wants zoom still behaves as
before.

### S3 — Toast styled like the app

> "Estiliza el toast para que vaya de acuerdo al estilo de la app."

react-toastify v11 themes itself through CSS custom properties (42
`--toastify-*` variables in the installed stylesheet). Override them with the
app tokens: surface background, `--color-success` for success, `--color-danger`
for error, `--radius-md`, the app font, our shadow and padding, and matching
icon/progress-bar colors. Because our tokens already switch with
`prefers-color-scheme`, the existing `theme="auto"` follows light/dark without
extra JS.

Acceptance: the notification uses the app's colors, radius, font and both
schemes; `toast.success('Carta eliminada')` keeps being asserted.

### S4 — Continuous animation on the foil layer

> 'La capa "foil" se ve como un degrade, quiero que tenga una animación continua.'

`.card-foil` carries the pointer-driven inline `transform` from motion, so a
keyframe on that same element would override it. Split into two layers:
`.card-foil` keeps the pointer transform and an inner `.card-foil-band` runs an
infinite `@keyframes` transform of its own. Both transforms are composited, so
the sweep costs no repaint (animating `background-position` would repaint every
frame). Rendering stays gated on `entry.finish === 'foil'` and on
`prefersReducedMotion`, with a defensive `animation: none` under reduced motion.

Acceptance: `.card-foil-band` exists inside `.card-foil`; the band sweeps
continuously in the browser; reduced motion renders no animation.

### S5 — Finish is no longer editable in the detail

> "Quita la posibilidad de editar foil o no foil del detalle de carta en el binder, deja solo cantidad y notas."

`CardDetail` loses `draftFinish`, the `<select aria-label="Acabado">`,
`availableFinishes` and `KNOWN_FINISHES`. `FINISH_LABELS` stays for the
read-only `Acabado:` row. `onSaveDetails` narrows to notes; the
`updateEntryDetails` store action is **not** touched — it keeps accepting
`finish?` for the future API and its tests stay green. The edit panel keeps
notes and quantity only.

Consequence accepted and reported: the add-card checkbox becomes the only place
a finish can be declared, so legacy entries with `finish: undefined` can no
longer be corrected.

Acceptance: in edit mode there is no "Acabado" control; saving notes persists
notes and leaves `finish` untouched; the read-only row still shows
`Nonfoil`/`No declarado`; quantity editing and the removal confirmation are
unaffected.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S5 | inline | done | a6adadb |
| T2 | S1 | inline | done | a6adadb |
| T3 | S2 | inline | done | a6adadb |
| T4 | S4 | inline | done | a6adadb |
| T5 | S3 | inline | done | a6adadb |

Route note: every task is inline — no writer trigger fired (no parallel
disjoint units, no context backstop) and T1/T2/T3 all touch
`CardDetail.tsx`, so they cannot run in parallel anyway.

## Log

**L1 (2026-10-13)** — original request, verbatim:

> Ahora:
>
> 1. Estamos en la vista desktop, en el detalle de la carta del binder mueve la sección de deseantes al espacio que tenemos a la derecha de la pantalla. En esta sección el diseño en desktop debería ser de 3 columnas.
> 2. Ya tenemos el efecto 3D en el hover de la carta en el detalle de la carta en el binder. Ahora agreguemos la misma funcionalidad de zoom con modal que tenemos en el buscador en la sección lista de deseos.
> 3. Estiliza el toast para que vaya de acuerdo al estilo de la app.
> 4. La capa "foil" se ve como un degrade, quiero que tenga una animación continua.
> 5. Quita la posibilidad de editar foil o no foil del detalle de carta en el binder, deja solo cantidad y notas.
>
> Haz un plan

**L2 (2026-10-13)** — Plan approved with "si, ejecuta el plan". Execution order
T1 (S5) → T2 (S1) → T3 (S2) → T4 (S4) → T5 (S3): removing finish editing first
shrinks `CardDetail` before its layout moves.

**L3 (2026-10-13)** — Stated assumption in the plan: wanters cells show avatar
plus visible name; bare circles offered as the alternative. Also stated: items
S1 and S4 cannot be seen with real data today (the wishers port returns `[]`
and almost no entry declares foil), so temporary fixtures are used for the
browser review and reverted before delivery, with evidence recorded here.

**L4 (2026-10-13)** — T1 (S5) done, inline. RED: `does not offer a finish
control while editing` failed with `expected document not to contain element,
found <select`, and `leaves a declared finish untouched when only notes are
edited` failed because the payload still carried `finish: undefined`. GREEN:
`CardDetail` lost `draftFinish`, the `Acabado` select, `availableFinishes` and
`KNOWN_FINISHES`; `onSaveDetails` narrowed to `{ notes: string }` and the save
sends `{ notes }` only, so the store's partial merge (`{ ...entry, ...patch }`)
preserves a declared finish. `offers only finishes the printing actually has`
was deleted along with the control. The store action is untouched. Gates: 121
tests, `tsc` 0, `oxlint` 0, `build` ok.

**L5 (2026-10-13)** — T2 (S1) done, inline, **no RED test** — a jsdom
assertion cannot prove a grid; documented exception, verified by build + lint
+ browser review instead. CSS at ≥720px: `.card-detail-page` drops the 420px
cap, `.card-detail-grid` becomes `minmax(280px, 420px) 1fr minmax(260px,
340px)`, and all four children are placed explicitly (media 1/1, meta 2/1,
edit 2/2, `.wanters` 3 spanning rows 1-2) because implicit auto-flow drops the
fourth child into a new row and leaves a hole at the top right. The old
`.card-detail-edit` placement media query was merged into this block.
`.wanters-list` becomes a 3-column grid there. `WhoWants` cells render avatar
plus visible name: the photo is now decorative (`alt=""`) and the initial
fallback is `aria-hidden`, so the visible name carries the accessible text —
`WhoWants.test` updated. Gates: 121 tests, all green.

**L6 (2026-10-13)** — T3 (S2) done, inline, RED first (four zoom tests in
`CardDetailPage.test`). GREEN: shared `src/shared/components/CardZoom.tsx`
(portal, scrim, Escape/scrim/"Cerrar", focus in and restored, `AnimatePresence`)
and `WantCardZoom` is now a wrapper keeping its copy; the CSS classes were
renamed `want-zoom-*` → `zoom-*` after grep confirmed no test referenced them.
The detail media gained `role="button"`, `tabIndex=0`, `aria-label="Ampliar
{setName} #{collectorNumber}"`, click and Enter/Space, `cursor: zoom-in` and a
`:focus-visible` ring. The click focuses the wrapper explicitly: browsers focus
a focusable element on click and jsdom does not, and focus restoration on close
depends on it. Type fix: `OracleCard.imageNormal` is optional, so the wrapper
passes `?? ''`, preserving the previous rendering exactly. Gates: 125 tests.

**L7 (2026-10-13)** — T4 (S4) done, inline, RED first (`.card-foil-band`
absent). GREEN: the foil layer is split — `.card-foil` keeps motion's inline
pointer transform and an inner `.card-foil-band` owns the gradient plus
`@keyframes card-foil-sweep` (3.6s, ease-in-out, infinite alternate, translate
plus a 1.5deg rotation). Both transforms are composited, so the sweep repaints
nothing; a keyframe on the parent element would have been overridden by
motion's inline transform, which is exactly why the layers were separated.
`animation: none` under reduced motion kept as a second belt. Gates: 126
tests.

**L8 (2026-10-13)** — T5 (S3) done, inline, **no RED test** — styling only,
jsdom does not paint toasts; documented exception. A `.Toastify` scope maps the
library's variables onto app tokens: surface background, our border, radius,
shadow, padding and font, `--color-success` / `--color-danger` /
`--color-accent` for the semantic colors (the icon and the progress bar
default to those variables, so one mapping keeps both in sync), muted progress
bar for default toasts, plus a border on the toast and a themed close button.
Because the app tokens follow `prefers-color-scheme` and the container renders
with `theme="auto"`, light and dark both work without extra JS. The installed
stylesheet was read first to confirm which rule consumes each variable
(`.Toastify__toast-theme--*` reads `--toastify-toast-background`, the progress
bars read `--toastify-color-progress-*`). Gates: 126 tests, `tsc` 0,
`oxlint` 0, `build` ok. **All five tasks complete; nothing committed.**

**L9 (2026-10-13)** — Open items for the user, not code defects: (1) the
3-column wanters layout and the foil sweep need eyes in the browser — the
temporary fixtures the plan mentioned were **not** applied, so today the
wanters section shows its empty state and no grid card shimmers unless a copy
is declared foil (add one with the checkbox, or declare it in the data); (2)
toast styling is browser-verified only; (3) the two contrast advisories from an
earlier theme verifier remain undecided.

**L10 (2026-10-13)** — Bug report: "El toast se ve transparente." Root cause
verified against the installed library, not guessed: (a) `.Toastify__toast`
carries no background at all — the paint comes exclusively from
`.Toastify__toast-theme--light` / `--dark`, and those read
`--toastify-color-light` / `--toastify-color-dark`; (b) `--toastify-toast-background`
is declared by the library but read by no rule, so the first mapping was aimed
at a dead variable; (c) `type Theme = 'light' | 'dark' | 'colored' | (string & {})`
— that `(string & {})` escape is exactly what let `theme="auto"` typecheck
while v11 has no auto variant, so the container emitted
`Toastify__toast-theme--auto`, which nothing styles → transparent toast.
Fix: both theme variables now point at `var(--color-surface)` (a
scheme-aware token, so the surface follows the OS in either scheme) and the
container passes `theme="light"`. Regression test `src/app/layout.test.tsx`
pins the toast's class to a variant the stylesheet actually styles; observed
RED with the old prop (`expected 'Toastify__toast Toastify__toast-theme…' to
match /Toastify__toast-theme--(light|dark|colored)/`) and GREEN after. Gates:
127 tests, `tsc` 0, `oxlint` 0, `build` ok.

**L11 (2026-10-13)** — Two direct UI corrections, verbatim: (1) "En el detalle
de carta del binder el modal de zoom tiene el titulo de la carta y un botón de
cerrar, quitemoslos." (2) "En el detalle de carta del binder como titulo dice
'Detalle de carta', ahí debería decir el título de la carta."

Item 2 needed the model: `Printing` had no card title (`toPrinting` received
`card.name` and dropped it), so `Printing.name: string` was added, mapped as
`name: card.name ?? ''`. **No migration**: a `Printing` is never persisted —
`BinderEntry` stores only `printingId` and the catalog lives in the TanStack
cache — and the field follows the existing convention of required strings with
an empty fallback. Fixtures updated in AddCard, WantEntryForm, CardSlot,
CardFlightOverlay and Card3D.

Item 1: `CardZoom.title` became optional. With a title the modal renders the
header + `Cerrar` (the wants list passes `card.name` and keeps both — its own
`WantEntryForm` tests are the guard that the shared refactor changed nothing
there). Without a title the modal is image-only, takes its accessible name
from `alt` through `aria-label`, and closes on Escape or a scrim click, so the
existing close-button test was replaced by a scrim-click test. `CardDetail`
no longer passes a title.

The detail `<h1>` is now `printing.name`, falling back to
`setName #collectorNumber` when the name is empty; loading, error and
not-found keep "Detalle de carta" because no printing is resolved yet.

Evidence: RED observed for both items before the fix (2 failed:
`renders the detail for a store entry with a resolved printing` and `opens the
zoom modal when the enlarged image is clicked`), GREEN after. Gates: 127 tests,
`tsc` 0, `oxlint` 0 (pre-existing `set-state-in-effect` warning), `build` ok.

**L12 (2026-10-13)** — Direct correction, verbatim: "Agrega la edición luego del
nombre en el titulo separado por un guión." The detail heading is now
`<card name> — <set name>`, e.g. `Lightning Bolt — Limited Edition Alpha`; the
em dash (U+2014 with spaces) matches the dash Scryfall already puts in type
lines. When the catalog hands no name the heading keeps the plain
`<set> #<collector number>` label, and an empty `setName` never leaves a
trailing dash. Test updated (`Test Card — Test Set`) plus a new test pinning
the unnamed fallback. Evidence: RED observed (1 failed, "Unable to find an
accessible element with the role heading and name 'Test Card — Test Set'"),
GREEN after. Gates: 128 tests, `tsc` 0, `oxlint` 0 (pre-existing warning),
`build` ok.

**L13 (2026-10-14)** — Committed in `a6adadb feat(binder): foil surfaces,
detail editing and card detail polish` (T1-T5). Final tree gates: `tsc` 0,
136/136 tests, `oxlint` 0 errors / 1 pre-existing warning, `build` ok.
