# Feature: Tactile Binder — binder-app

## Objective

Build the tactile virtual binder of binder-app: a single-user, highly interactive and animated
interface where the user browses their physical Magic: The Gathering collection as if handling a
real binder, backed by LIVE Scryfall data for the card catalog.

## Problem

Card trading apps fail on UX when collections are presented as boring list/table UIs. This app
must FEEL physical — 3D card tilt, zoom, glare, card "flights" when adding, binder page turns —
while staying fast with 1000+ cards.

## Why

The user chose this as the first product slice. The matching engine (users who have/want a card)
is explicitly out of scope for now, but the data model MUST preserve the oracle/printing split so
future matching works without a redesign.

## Scope (in)

- Card catalog from the live Scryfall API, behind `CatalogPort`.
- Binder of user-owned physical printings, persisted locally (zustand + persist → localStorage)
  behind `BinderPort` (swap to the future backend API later, components untouched).
- Tactile interactions: 3D tilt, zoom, shadow, contextual hover info, page turns, add-card flight.
- Wants list (local for now) and card detail view.
- dnd-kit for drag-and-drop card placement; `motion` for choreography.
- Respect `prefers-reduced-motion`.

## Constraints

- React 19 + Vite + TS 6; no backend yet; no auth yet.
- Scryfall rate limits (~10 req/s) and CORS-enabled API; catalog is cached by TanStack Query.
- Performance: GPU transforms only; virtualization / `content-visibility` for large grids; lazy
  card images; `will-change` used with discipline.
- Generated artifacts in English.
- No test runner configured yet (vitest to be added at T3); verification is `tsc -b && vite build`
  + oxlint until then — exception documented per task.

## Tasks

- [x] **T1 Foundation**: domain types (`OracleCard`, `Printing`, `BinderEntry`, `WantEntry`),
      `CatalogPort` + live Scryfall adapter, `BinderPort` (local persistence), providers
      (QueryClient, Router), app shell with routes. Acceptance: `npm run build` passes; app boots.
      — Verdict: `granted` (RDD on, assessed passive, no reviewer needed). Evidence: commit
      `ae78053`; `npm run build` (tsc -b && vite build) and `npx oxlint` clean; dev server boots.
      Route: delegated direct (gentle-ai-worker, writer trigger). Worker deviations: root App moved
      to `src/app/App.tsx` (scaffold `src/App.tsx` deleted, `main.tsx` repointed); `eslint`-free
      project — oxlint `react/only-export-components` fixed by extracting `queryClient.ts`;
      `BinderPort` adapter kept as future seam (store persists via zustand persist, shared key
      `binder-app:binder:v1`); Scryfall discovery: DFC cards omit top-level `image_uris`
      (uses `card_faces[0].image_uris`), missing prices are `null` (normalized to `undefined`),
      tokens can lack `oracle_id` (falls back to printing id).
- [x] **T2 Binder layout**: `BinderPage` grid + `CardSlot` + real card rendering fed by
      catalog queries (search/named + printing fetch).
- [x] **T3 Tactile Card3D**: hover tilt, glare, zoom, shadow, contextual info panel
      (quantity / condition / set).
- [x] **T4 Add-card flow**: search → pick printing → flight animation into a slot; dnd-kit
      drop support; optimistic binder update.
- [ ] **T5 Wants list + card detail**: (in progress) want-entry UI + card detail view + routing polish.
- [ ] **T6 Reduced motion, perf pass, final verification**.

## Authorized scope

Directories `src/app`, `src/shared/api`, `src/features/*` and top-level entry files
(`src/main.tsx`, `src/App.tsx`, `src/index.css`) inside `binder-app/` only.

## Acceptance criteria

- `npm run build` (tsc -b && vite build) passes; `npm run dev` boots clean.
- Cards render in a binder-page grid from live Scryfall data.
- Adding a card to the binder animates the placement and persists across reloads.
- All interactions respect `prefers-reduced-motion`.
- `BinderEntry` references a physical `printingId`; `WantEntry` references an `oracleId` with
  optional `preferredPrintingId`.

## Checks

- `tsc -b && vite build`
- `npx oxlint`
- Native review (`gentle-ai review assess`) per work-unit commit when enabled.

## Delivery

- Strategy: `ask-on-risk` (default) — will ask before chaining when the delivery budget
  (≈400 authored lines) is reached.
- Forecast: ≈1000 authored lines across 6 tasks → chaining expected at T3/T4 boundary.
- Branch: `main` initially; slice branches created when chaining starts.

## Route declaration

- T1: delegated direct (writer trigger: 2+ non-trivial files).
- T2: delegated direct (writer trigger: 2+ non-trivial files) — in progress. New repo branch point: `697305b` (binder-app standalone). T1's RDD verdict: N/A (review abandoned during migration; next work-unit commit starts a fresh review lifecycle).
- T2 commit: `44768f5` (work-unit: BinderPage + CardSlot + index.css). Verified: build PASS, oxlint PASS, dev-smoke PASS. RDD assess: medium, slice_budget_reached (507 lines), review_due=true. Consent: granted (lineage `review-28ea5c7f2555b2e8`, lens `review-reliability`, revision `sha256:d67c40841b735e795d76c08a29a1172dcc92d36b9f72d91f0e5d8a4129391be7`). STATUS: lens slot reoffered UNREVIEWED — reviewer Task transport `opencode_review_transport_binding_invalid` (session workspace != repo binder-app). RESUME: open a session with cwd in binder-app, run the exact collected STATUS for lineage `review-28ea5c7f2555b2e8`, launch the reviewer task, capture, then acknowledge.