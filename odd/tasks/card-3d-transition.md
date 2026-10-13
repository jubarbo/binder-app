# Feature: card-3d-transition

Cinematic 3D transition between the binder grid and the card detail view: the
selected card lifts from its pocket, flies toward the user with CSS 3D
perspective, fades out, and hands off to the detail page. Overlay-driven with
immediate navigation (URL is the single source of truth).

Branch: `feature/card-3d-transition` (from `dev`). Delivery: single branch, no
remote (repo policy: no push/PR unless requested). Test runner: `npx vitest run`
(no `test` script in package.json). Validation: `npx tsc -b`, `npx oxlint`,
`npx vitest run`, `npm run build`.

## Specs

- **S1** Clicking a card in the binder grid starts a flight animation and
  navigates to `/card/:entryId` (the existing route and URL scheme; no second
  source of truth for the selected card). Rapid repeat clicks while a flight is
  active do not start a second flight or a duplicate navigation.
- **S2** Flight phases: A lift ~140 ms (slight scale + subtle 3D rotation +
  intensified shadow) over a dimming layer; B fly ~380 ms from the card's real
  `getBoundingClientRect()` toward a viewport-centered position with CSS
  perspective, directional rotateX/rotateY/rotateZ and viewport-adaptive end
  scale; C fade ~200 ms overlapping B. Total ~600-800 ms. Motion uses
  transform/opacity primarily with a natural easing curve.
- **S3** The overlay layer is viewport-anchored (position fixed, portal to
  body), mounted from `AppLayout` so it survives route changes, has
  `pointer-events: none` and `aria-hidden="true"` at all times (decorative
  duplicate, no interactive or screen-reader duplication), and cleans up all
  transient state after the animation. A flight expires by timestamp so an
  unmounted overlay can never block future clicks.
- **S4** Under `prefers-reduced-motion` (honored via the global
  `MotionConfig reducedMotion="user"` plus explicit `useReducedMotion` checks)
  there is no flight: navigation happens directly with at most a brief opacity
  transition.
- **S5** The detail view fades in (~180 ms opacity) so the handoff has no
  blank frame, flash, or visible jump. Detail data keeps the existing fetching
  strategy (store entry + cached `usePrinting`; no duplicate network requests,
  no fake data).
- **S6** Returning to the grid (browser Back or app nav) preserves the grid
  page index (sessionStorage-backed) so page position is not lost.
- **S7** No new dependencies. TypeScript explicit types, no `any`. Styles
  encapsulated as `.card-flight-*` classes in `index.css` (project convention),
  no global rules affecting other components. No console errors/warnings.
- **S8** Validation gates pass: `npx tsc -b`, `npx oxlint`, `npx vitest run`,
  `npm run build`. Existing navigation tests keep passing; new tests cover
  flight start, reduced-motion bypass, repeat-click guard, and cleanup.

## Tasks

- [x] **T1** `flightStore.ts` (new, `src/features/binder/transition/`): zustand
      module store for the active flight (entryId, image URLs, alt, start rect,
      startedAt) with `beginFlight`/`clearFlight` and timestamp-based expiry. —
      route: inline. Done.
- [x] **T2** `CardFlightOverlay.tsx` (new): portal layer rendering the flying
      card with declarative motion keyframes for phases A/B/C, dim layer, and
      cleanup on animation end + unmount. Mounted in `layout.tsx`. — route:
      inline. Done. Geometry extracted to `transition/flightGeometry.ts` to
      satisfy oxlint `only-export-components`.
- [x] **T3** Wire initiation: `Card3D` passes its element to `onOpenDetail`;
      `CardSlot` begins the flight (rect capture) and navigates; reduced-motion
      bypasses the flight. Repeat clicks guarded by fresh
      `useFlightStore.getState()` read. — route: inline. Done.
- [x] **T4** Detail handoff: fade-in (opacity 180ms, delay 80ms) on the
      `CardDetailPage` success section via `motion.section`. — route: inline.
      Done.
- [x] **T5** Grid state: `BinderPage` persists `pageIndex` to sessionStorage
      (`binder-app:grid-page`), restored on mount. — route: inline. Done.
- [x] **T6** CSS: `.card-flight-*` classes appended to `index.css` (layer
      z-index 200 above the add-card overlay's 100, pointer-events none, dim,
      perspective 1100px, card frame + high-res img fade-in). — route: inline.
      Done.
- [x] **T7** Tests (`CardFlightOverlay.test.tsx`, 9 tests): flight begins on
      click with real rect + navigation; reduced-motion bypass; active-flight
      click guard (no dup navigation); expired-flight navigation still works;
      store expiry; geometry centering/ratio/viewport-fit/tilt caps; overlay
      idle/active render + aria-hidden; unmount cleanup; reduced-motion clear.
      — route: inline. Done.
- [x] **T8** Validation: `npx tsc -b` clean, `npx oxlint` exit 0 (no
      warnings), `npx vitest run` 36/36 across 7 files, `npm run build` ok. —
      route: inline. Done.

## Log

- **L1** (user, 2026-10-12): "Implementar transición cinematográfica 3D entre el
  grid y el detalle de una carta" — full spec sections 1-13: lift → fly →
  fade → detail; motion/react + CSS 3D, no three.js/react-pageflip; overlay
  architecture with getBoundingClientRect; immediate consistent routing; 12 edge
  cases; prefers-reduced-motion; validation with tsc/lint/tests/build; Spanish
  delivery report.
- **L2** (2026-10-12): Implementation complete on `feature/card-3d-transition`.
  Approach: overlay (not layoutId) with IMMEDIATE navigation — URL is truth at
  t=0; the flight is presentation-only (store + portal mounted in AppLayout).
  Timings: lift 140ms / fly 380ms / fade 200ms = 720ms total. Fixed 3
  first-pass defects (missing `FLIGHT_FLY_MS` import; `as const` easing tuple
  vs `Easing[]`; moved `computeFlightGeometry` out of the component file for
  `only-export-components`). All gates green: tsc clean, oxlint exit 0, vitest
  36/36, build ok. Not committed (repo policy: only on explicit user request).
  Not machine-verifiable: real-browser visual quality/timing; resize mid-flight
  (geometry computed once per flight; no residual state).
- **L3** (2026-10-12): Hover reworked into a physical rocking feel (small
  follow-up request: "necesitamos mejorar el hover… como un 'balanceo' de una
  carta físico"). `Card3D.tsx`: pointer values now go through lightly
  underdamped `useSpring`s (stiffness 150, damping 12, mass 0.8) so the card
  lags the cursor and swings when settling/returning; added rotateZ ±3°
  ladeo and a hover lift scale spring (1.04); glare derives from the sprung
  values. `index.css`: moved `perspective` to `.binder-slot` (the parent —
  the previous value on the card itself never applied to its own rotation),
  deeper lift-off drop-shadow on hover. Tests: +1 smoke test for hover handler
  wiring (rocking itself is visual-only, not jsdom-assertable). Gates green:
  tsc, oxlint exit 0, vitest 37/37, build ok.
- **L4** (2026-10-12, user: "Bien, me gusta la animación. Si la separamos en:
  1. Animación de lanzamiento hacia el frente (perspectiva del usuario)
  2. Aparición de overlay para transición. 3. Transición a la siguiente
  página. 4. Aparición de la nueva página. Entonces modifiquemos: 1. La
  animación de lanzamiento debe ser más lenta. 2. El overlay de la transición
  debe hacer que todo vaya a negro claro. 3. La transición con fundido también
  puede ser más lenta. Todo esto hazlo y antes de commitear pideme revisión."):
  Sequence restructured into the 4 explicit phases. New contract: the route
  swap is NO LONGER immediate — the overlay orchestrates it at
  NAVIGATE_AT_MS=820, hidden under a full sink to near-black (#0a0a0c, "soft
  black" per "negro claro", not pure #000; adjustable). Timings: lift 160 /
  fly 560 (end size raised to 94vh — launches toward the user) / card
  dissolve 300 ending exactly at the swap / black dissolve reveal 320; total
  1140ms. `CardSlot` no longer navigates on click (except reduced-motion
  direct nav); it records `locationKey` so the overlay cancels the scheduled
  swap if the user navigates on their own (Back/nav link) mid-sequence. Dim =
  one choreographed curve [0, 0.28, 1, 1, 0]: gentle scene dim during launch
  → full black hides the swap → dissolve reveals the new page. Tests: 39/39
  (orchestration tested with fake timers faking only setTimeout/clearTimeout;
  new cases: swap lands at exactly NAVIGATE_AT_MS, user-initiated navigation
  cancels the swap). Gates green: tsc, oxlint 0, vitest 39/39, build ok.
  NOT committed — user asked to review before committing.
- **L5** (2026-10-12, user: "Disminuye apenas la velocidad en la que la carta
  se mueve hacía el usuario."): `FLIGHT_FLY_MS` 560 → 620 (~11% slower
  approach). Sequence stays coherent without other changes: fly now ends at
  780ms, full black at ~800ms, swap still at 820ms, reveal to 1140ms (all
  times are normalized over `FLIGHT_TOTAL_MS`). Gates green: tsc, oxlint 0,
  vitest 39/39. Still NOT committed — awaiting user review.
- **L6** (2026-10-12, user: "Bien, hazlo 5% más lento"): `FLIGHT_FLY_MS`
  620 → 651 (620 × 1.05). Invariants hold: fly ends at 811ms, full black at
  ~816ms, swap still hidden at 820ms. Gates green: tsc, oxlint 0, vitest
  39/39. Still NOT committed — awaiting user review.
- **L7** (2026-10-12, user: "Tenemos un bug visual, la carta parpadea antes de
  desaparecer."): two flicker sources fixed. (1) Card opacity keyframes ended
  at `times` 0.719 < 1 — if the engine does not hold the last keyframe value,
  the card reappeared between the swap (820ms) and teardown (1140ms); now
  `opacity: [1, 1, 0, 0]` with `times: [0, CARD_FADE_START, NAVIGATE_AT, 1]`
  anchors the dissolve to the end. (2) The sharp (`imageNormal`) layer could
  mount mid-flight with a visible 120ms crossfade when not yet decoded;
  `CardSlot` now only carries `imageNormal` into the flight when the grid
  already hydrated it (`normalLoaded`), and the overlay mounts that layer
  pre-visible (`useState(imageNormal !== '')`) — the flight shows exactly what
  the user was seeing in the grid. Tests: +2 (sharp image left behind when the
  grid never hydrated it; carried-over sharp layer mounts visible). Gates
  green: tsc, oxlint 0, vitest 41/41. Still NOT committed.
- **L8** (2026-10-12, user: "al hover luego del balanceo la carta queda con un
  pequeño blur"): the `filter: brightness() drop-shadow()` hover rule was the
  blur source — a filter forces the card onto its own raster surface and
  flattens the 3D context, while the rock springs keep writing composited
  transforms that scale a stale raster → persistent softness. Replaced with
  `box-shadow` lift-off (paints in local space, transforms with the card; a
  `.card-slot--stacked:hover` rule preserves the stacked edges under the new
  shadow). Also removed the pre-existing `transition: transform 0.2s` from
  `.card-slot` — a CSS transition fighting motion's springs double-smooths and
  parks the card at fractional transforms (resampling blur); motion now fully
  owns transform, CSS only eases the shadow. Lost: the 1.06 brightness
  polish (no non-filter way to express it; lift scale + shadow carry the
  feedback). Gates green: tsc, oxlint 0, vitest 41/41, build ok. Still NOT
  committed.
- **L9** (2026-10-12, user: "Pronuncia aun más la animación del hover."):
  amplitude boost across four knobs in `Card3D.tsx` + `index.css`:
  POINTER_GAIN 0.5 → 0.85 (a grid card previously only reached ~a third of
  the tilt range, reading timid), tilt ranges ±8/±8/±3 → ±11/±11/±5,
  LIFT_SCALE 1.04 → 1.07, rock damping 12 → 11 (zeta ~0.50, two visible
  settle swings), and `.binder-slot` perspective 1000 → 800px so each degree
  of tilt reads deeper. Scale stays within the 12px grid gap (~5px/side).
  Gates green: tsc, oxlint 0, vitest 41/41. Still NOT committed.
