# binder-foil-detail — Foil UX, quantity deletion and detail enhancements

Five binder improvements: foil as a checkbox when adding, a holographic foil effect
on grid cards, quantity editing with a confirmed delete in the detail, a "wanters"
section backed by a port (no user model exists yet), and the rocking 3D motion in
the detail. Follow-ups folded into the same document: foil visibility tuning (T6),
the foil checkbox in the detail's edit panel (T7) and the foil surface on the detail
and the zoom (T8).

Branch: `dev` (work-unit commits; no push/PR unless the user asks).
Delivery: `ask-on-risk`. Forecast ~900 authored lines across 5 tasks.
Test runner: `npx vitest run`. Gates: `npx tsc -b`, `npx oxlint`, `npm run build`.

## Specs

### S1 — Foil as a checkbox in the add-card flow

> "Cambiemos el Select de foil por un check."

When the selected printing offers exactly the finishes `['nonfoil', 'foil']`, the
add-card flow shows a single "Foil" checkbox instead of the "Acabado" select:
checked stores `finish: 'foil'`, unchecked stores `finish: 'nonfoil'`. Any other
multi-finish set (etched present) keeps the existing select as an escape hatch, and
a single-finish printing keeps auto-assigning. The `Finish` union and the
undeclared (`undefined`) value are unchanged. The card detail's edit panel has no
finish control of its own in this spec — see S6.

Acceptance: adding with the checkbox checked stores `finish: 'foil'`; unchecked
stores `'nonfoil'`; an etched printing still renders the select; a single-finish
printing still auto-assigns with no control.

### S2 — Holographic foil effect on the binder grid

> "Dime si puedes revisar https://codeshack.io/holographic-foil-card-effect-js/ para implementar ese efecto en el grid del binder cuando la carta es foil."

A foil layer renders over the grid card image only when `entry.finish === 'foil'`:
a rainbow gradient at `background-size: 300%` whose position follows the pointer
tracking already produced by `useCardRock`, blended with `mix-blend-mode: screen`
and `pointer-events: none`. Entries without a declared finish never shimmer. Under
`prefers-reduced-motion` the sweep animation is dropped but the layer still
renders as a static stripe: reduced motion removes the movement, never the
information that the copy is foil.

Acceptance: a foil entry renders the layer with the foil class; a non-foil or
undeclared entry does not; no pointer listeners are added beyond `useCardRock`'s;
a foil entry renders the layer under reduced motion too (static).

### S3 — Quantity editing with confirmed deletion

> "En el detalle de la carta del binder debemos poder editar la cantidad, si la llevamos a 0 debería abrirse un modal de confirmación que avise que si la cantidad es 0 la carta se eliminará del binder. Si el usuario confirma muestra notificación de carta eliminada y redirige a binder."

In the binder card detail the quantity is editable inline (1-99). Entering 0 does
not persist: a confirmation dialog warns that the card will be removed from the
binder. Confirming removes the entry, shows the notification "Carta eliminada" and
navigates to the binder (`/`). Cancelling restores the previous quantity and
changes nothing.

Notifications use `react-toastify` (new dependency: 11.1.0, peer `react ^18 || ^19`)
rendered from `AppLayout` with role `status`. The confirmation reuses a shared
`ConfirmDialog` extracted from `WantRemoveConfirm`; `sweetalert2` is rejected because
it would duplicate the app's modal system, scroll lock and focus handling.

Acceptance: quantity 1-99 persists through `updateQuantity`; 0 opens the dialog and
leaves the store untouched; confirm removes the entry, toasts "Carta eliminada" and
navigates to `/`; cancel restores the previous quantity.

### S4 — Wanters section (option A)

> 'En el detalle de la carta del binder mostremos una sección con los avatars de los usuarios que "desean" esa carta.'

Approved as option A: a `WishersPort` interface with a local implementation. There
is no user model, auth or backend today, so the local implementation returns an
empty list; the section renders its empty state and the real API plugs in later
without touching components. Matching is by `oracleId` against the entry's printing
oracle. No invented users are rendered.

Acceptance: the detail renders a "wanters" section; with the local port it shows
the empty state; the port is the only data source (no direct store/API reads in the
component).

### S5 — Rocking motion in the detail

> "Hagamos el mismo efecto de movimiento 3D sobre la carta en el detalle del binder."

The detail's card image uses the shared `useCardRock` (tilt, lift, glare) with the
same reduced-motion behaviour as the grid and the wants preview.

Acceptance: the detail media is a `motion.div` carrying the rock handlers and
style; under reduced motion it stays static.

### S6 — Foil checkbox in the detail's edit panel

> "Perfecto, agrega en el detalle en la opción editar el check para marcar o desmarcar foil"

The detail's edit panel gains a "Foil" checkbox. It starts checked when
`entry.finish === 'foil'`, and saving carries `finish` in the patch **only when the
checkbox actually changed it**: checked stores `'foil'`, unchecked stores
`'nonfoil'`, an untouched box sends no finish at all. So editing notes on a copy
that never declared one still leaves it `No declarado`, and no save can rewrite a
declaration the user did not touch. The `Acabado` select does not come back: the
checkbox is the only finish control in the panel.

Acceptance: checking stores `finish: 'foil'` and unchecking stores `'nonfoil'`,
together with the notes; saving notes alone yields a patch whose keys are exactly
`['notes']`, for declared and undeclared copies alike; no `Acabado` combobox renders
while editing.

### S7 — Foil on the detail image and the zoom modal

> "Puedes aplicar el efecto foil en la imagen de la carta en el detalle y el modal zoom?"

The holographic layer is no longer exclusive to the binder grid. The detail's
enlarged image carries it when `entry.finish === 'foil'`, driven by the same
pointer-linked offsets as the grid (the detail rocks too), and the zoom modal opens
with it already painted. Both surfaces render through one shared `FoilLayer`
component, mounted inside a box that clips to the image (`.card-detail-frame`,
`.zoom-frame`) so the deliberately oversized band never paints past the card edge.

The wants zoom never carries it: a want is an oracle-level desire with no declared
finish, so `CardZoom`'s `foil` prop stays off there.

Acceptance: a foil copy shows `.card-foil` and `.card-foil-band` over the detail
image and inside the zoom dialog; a non-foil copy shows neither; the grid's foil
tests keep passing against the extracted component.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1 | inline | done | — |
| T2 | S5 | inline | done | — |
| T3 | S2 | inline | done | — |
| T4 | S3 | inline | done | — |
| T5 | S4 | inline | done | — |
| T6 | S2 | inline | done | — |
| T7 | S6 | inline | done | — |
| T8 | S7 | inline | done | — |

Route note: every task is inline — no writer trigger fired (no parallel disjoint
units, no context backstop), and T3/T4/T5 share `CardDetail.tsx` so they cannot run
in parallel anyway.

## Log

**L1 (2026-10-13)** — original request, verbatim:

> Analiza y haz un plan.
>
> 1. Cambiemos el Select de foil por un check.
> 2. Dime si puedes revisar https://codeshack.io/holographic-foil-card-effect-js/ para implementar ese efecto en el grid del binder cuando la carta es foil.
> 3. En el detalle de la carta del binder debemos poder editar la cantidad, si la llevamos a 0 debería abrirse un modal de confirmación que avise que si la cantidad es 0 la carta se eliminará del binder. Si el usuario confirma muestra notificación de carta eliminada y redirige a binder.
> 4. En el detalle de la carta del binder mostremos una sección con los avatars de los usuarios que "desean" esa carta.
> 5. Hagamos el mismo efecto de movimiento 3D sobre la carta en el detalle del binder.

**L2 (2026-10-13)** — Notification stack decided. User: "Podemos usar tostify como libreria de toast o swal como notificaciones o qué recomiendas?" Recommendation accepted: `react-toastify` for notifications (verified 11.1.0, peer `react ^18 || ^19`), our own shared `ConfirmDialog` for confirmations. `sweetalert2` rejected: it is an imperative modal library that would duplicate the app's modal system, scroll lock and focus handling, and would break the toast-vs-confirmation separation.

**L3 (2026-10-13)** — Item 4 resolved as option A. User: "Respecto al punto 4 hagamos ru recomendación que es la opción A." Rationale recorded in S4: no user model, auth or backend exists, so the section ships behind `WishersPort` with an empty local implementation instead of invented avatars.

**L4 (2026-10-13)** — Plan approved with "si". Implementation starts at T1.

**L5 (2026-10-13)** — T1 (S1) done, inline. RED: the new checkbox tests failed with `Unable to find an accessible element with the role "checkbox" and name "Foil"`. GREEN: `isFoilToggle` helper in `AddCard.tsx` (true only for exactly `['nonfoil','foil']`), checkbox branch replacing the select in that case, `.add-card-finish-toggle` style. Etched sets keep the select; single finishes keep auto-assigning. Gates: 110 tests, `tsc` 0, `oxlint` 0, `build` ok. No commit yet — this repo's rule is commits only on explicit request.

**L6 (2026-10-13)** — T2 (S5) done, inline. RED: `expected null not to be null` on `.card-detail-media-card`. GREEN: local `CardDetailMedia` component in `CardDetail.tsx` wrapping the enlarged image in a `motion.div` driven by the shared `useCardRock` (glare layer included, placeholder branch preserved), plus `.card-detail-media-card` CSS. Note found while testing: the `.card-detail-image--placeholder` branch in the detail is unreachable through `CardDetailPage`, which returns its own error state when the printing is missing — left as defensive code, not tested. Gates: 111 tests, `tsc` 0, `oxlint` 0, `build` ok.

**L7 (2026-10-13)** — T3 (S2) done, inline. `useCardRock` now also exposes `rockX`, `rockY` and `prefersReducedMotion` so a consumer can drive its own pointer-linked overlay from the same pointer truth. `Card3D` renders a `.card-foil` band (oversized rainbow gradient, `mix-blend-mode: color-dodge`, opacity 0.35) only when `entry.finish === 'foil'`, translated by the rock offsets (composited transform instead of a background repaint). Two Card3D tests cover foil vs non-foil/undeclared. **Browser tuning still pending**: the reference snippet uses opacity 0.6 and background-position animation; both were changed deliberately and need visual review on real card art. Gates: 113 tests.

**L8 (2026-10-13)** — T4 (S3) done, inline. Installed `react-toastify@11.1.0` (approved dependency) and mounted `<ToastContainer position="bottom-center" theme="auto" role="status" />` in `AppLayout`. Extracted `src/shared/components/ConfirmDialog.tsx` (portal, scrim, focus restore, Escape/scrim/reject cancel) and reduced `WantRemoveConfirm` to a thin wrapper preserving its fixed copy; `.want-confirm-*` CSS renamed to `.confirm-*`. `CardDetail` gained a quantity field in the edit panel (0-99): 0 asks for confirmation through `onRequestRemoval`, an empty field blocks saving (`Number('')` is 0, not NaN — handled explicitly), otherwise the draft persists via `onSaveQuantity`. `CardDetailPage` owns the decision: `ConfirmDialog` → `removeEntry` + `toast.success('Carta eliminada')` + `navigate('/', { replace: true })`; reject restores the draft. Copy invented by the implementer (not user-specified): "Si dejas la cantidad en 0, {setName} #{collectorNumber} se eliminará de tu binder." — the card's name is not in the `Printing` model (Scryfall has it, `toPrinting` drops it), so the label is set + collector number. Gates: 118 tests, `tsc` 0, `oxlint` 0, `build` ok.

**L9 (2026-10-13)** — Session stopped by context budget with T5 (S4, wanters section) pending. Resume at T5: `WishersPort` interface + local empty implementation, section in `CardDetail`, empty state.

**L10 (2026-10-13)** — T5 (S4) done, inline. New `src/shared/api/wishersPort.ts` following `catalogPort.ts`'s convention: `Wisher` (id, displayName, optional avatarUrl — no user model exists), `WishersPort.wishersOf(oracleId, signal)`, `localWishersPort` returning `[]`, and a `wishersPort` binding consumers must use. New `WhoWants` component queries the port (`queryKey ['wishers', oracleId]`, oracle-level matching per the data model) and renders avatars, falling back to the initial, or `Nadie la desea todavía.`; `CardDetail` mounts it when the printing is known. One integration gap found: `CardDetailPage.test` had no `QueryClientProvider`, so every detail test failed with "No QueryClient set" once the section was mounted — fixed by wrapping `renderPage`. Gates: 121 tests, `tsc` 0, `oxlint` 0, `build` ok. **All five tasks complete, nothing committed (repo rule).**

**L11 (2026-10-14)** — User, verbatim:

> Bien, trabajemos el foil que no se ve. Revisa y si está correcto tratemos de hacerlo más notorio o pronunciado.

Review verdict: **the wiring was correct, the rendering was not.** Three findings, in
order of impact:

1. `mix-blend-mode: color-dodge` at `opacity: 0.35` — the value L7 already flagged as
   pending browser tuning (the reference snippet uses 0.6). Dodge divides the backdrop
   by (1 - source), so over mid-dark art (most Magic art, plus the card frames) it
   produces almost nothing, and over light art it blows the highlights out: invisible
   on dark cards, blotchy on light ones.
2. `Card3D` gated the layer on `!prefersReducedMotion`, so with OS/browser
   reduce-motion on the foil never mounted at all. Reduced motion means "no
   animation", not "no information" — and the CSS already had the `animation: none`
   rule to honour that.
3. Sweep travel was only ±12% / ±5%: a drift, not a sweep.

Fix (S2 rewritten, T6): blend → `screen` (only ever adds light; the same blend
`.card-glare` already uses), opacity → 0.55, gradient stops 0.4 → 0.6 alpha and the
stripe tightened from 50% to 40% of the gradient, keyframes → `±18% / ±10%` with
rotation `±3deg`, duration 3.6s → 3s, and the `!prefersReducedMotion` gate removed
from the component so the media query carries the whole reduced-motion story (a
static stripe). Travel headroom was checked against the geometry instead of guessed:
the band box spans ~255% of the card and `useCardRock`'s pointer offset displaces the
parent by ±23.8% of the card, so ±18%/±10% never uncovers a card edge even at maximum
combined displacement.

RED observed: the new test "mounts the layer under reduced motion too, so the finish
stays readable" failed against the old gate (`useReducedMotion` mocked through
`vi.hoisted` + `vi.mock` so it does not leak into the other 10 Card3D tests).
GREEN after. Gates: 129 tests, `tsc` 0, `oxlint` 1 pre-existing warning
(`WantEntryForm.tsx:109`), `build` ok. Still open and data-side: only entries whose
`finish` is `'foil'` shimmer; undeclared and `nonfoil` entries stay flat by design.

**L12 (2026-10-14)** — User, verbatim:

> Perfecto, agrega en el detalle en la opción editar el check para marcar o desmarcar foil

Done, inline (S6, T7). Found while reading: S1's note that "the card detail's edit
panel keeps its select" was wrong — the panel had **no** finish control at all, and a
test pinned that (`does not offer a finish control while editing`, commented "Finish
is declared when the copy is added, never from the detail"). The select stays gone;
the checkbox is now the only control.

Design decision (implementer's, not dictated by the request): the patch carries
`finish` **only when the checkbox differs from the entry**. Three options weighed —
always send (breaks the keys-exactly-`['notes']` assertion and silently turns
`No declarado` into `nonfoil` the first time anyone edits an unrelated note), gate on
`printing.finishes` (hides the control for exactly the copies someone needs to
correct, and the panel renders before the printing query resolves), and dirty-only
(chosen: never rewrites an untouched declaration, keeps every existing test green).
Accepted limit: an undeclared copy cannot be declared `nonfoil` from the detail —
`unchecked` only means something against a declared `foil`.

Test edits: `does not offer a finish control while editing` became `offers a foil
checkbox instead of a finish select while editing` (keeps the "no `Acabado` combobox"
regression assertion, adds the checkbox); 3 new tests — mark, unmark, and untouched
finish with a notes-only patch whose keys are exactly `['notes']`. RED observed on
those 3; the untouched-finish test passed both before and after, which is the point:
it guards the rule the new control must not break. Gates: 132 tests, `tsc` 0,
`oxlint` 1 pre-existing warning (`WantEntryForm.tsx:109`), `build` ok.

**L13 (2026-10-14)** — User, verbatim:

> Puedes aplicar el efecto foil en la imagen de la carta en el detalle y el modal zoom?

Done, inline (S7, T8). The markup was extracted into a shared
`src/shared/components/FoilLayer.tsx` (outer layer takes the pointer transform,
inner band owns the sweep) and all three surfaces now mount it: grid (unchanged
behaviour, same tests), detail media (with `useTransform` over the detail's own
`rockX`/`rockY` — it rocks too, so the band travels under the cursor) and
`CardZoom` (static: the modal deliberately does not rock, so the layer sweeps with
no pointer offset).

Two clipping boxes were required because the band is intentionally larger than the
card: `.card-detail-frame` (the detail's media card has no `overflow: hidden`, and
the image is capped at 420px inside a wider column) and `.zoom-frame` (`width:
fit-content` so it hugs the centered image instead of the panel). In both cases the
`box-shadow` — and the zoom's `border-radius` — moved from the image to its frame,
because `overflow: hidden` clips the shadow a child paints outside its own box: same
box, same rendering, and the placeholder (which renders outside any frame) now owns
its shadow explicitly.

`CardZoom` gained `foil?: boolean`; the wants zoom never passes it, since a want is
oracle-level and has no declared finish. Tests: 4 new (`foil surface` describe —
detail flat/foil, zoom flat/foil). RED observed on the 2 presence tests. One flake
observed out of band and not caused by this change: `closes the zoom with Escape and
restores focus to the image` failed once at 324ms and passed on re-run — focus
timing, pre-existing. Gates: 136 tests, `tsc` 0, `oxlint` 1 pre-existing warning,
`build` ok.
