# Stage 3 — Trade proposal (match actions)

Feature document for Stage 3 of `odd/tasks/trading-platform-frontend.md`. Objective: turn the passive match surfaces into the first real trading action — proposing an inline "I offer X for Y" trade to a matched user. Branch: `feature/trading-identity`. Delivery: conventional work-unit commits on this branch (the user owns push/merge). Test runner: `npx vitest run`; verify `npm run build` + `npx oxlint`.

## Specs

S1 — Per-match action surfaces. Roadmap quote: "an action from each wisher/offerer in `WhoWants`/`WhoHas` ("proponer trade", later "contactar")". In `WhoWants`, each wisher row gains a "Proponer trade" button that opens the proposal panel with that wisher as counterpart. `WhoHas` keeps its compact no-names contract: its offerer faces become buttons with the displayName as accessible name, and clicking one opens the panel with that offerer as counterpart. "Contactar" is deferred until a messaging surface exists. Acceptance: both surfaces open the panel carrying the counterpart identity; the want row gains no new visible text beyond the existing count.

S2 — TradesPort seam. Roadmap quote: "a `TradesPort` (`proposeTrade` / `myTradePairs` / `respondTrade`) with local/mock". Contract: `proposeTrade(proposal: TradeProposal): Promise<TradePair>`, `myTradePairs(signal?: AbortSignal): Promise<TradePair[]>`, `respondTrade(pairId: string, action: 'accept' | 'decline'): Promise<TradePair>`; `TradeProposal = { counterpartId: string; give: { printingId: string; quantity: number }[]; ask: { oracleId: string; quantity: number }[] }`. Local port: honest unavailability — `proposeTrade` and `respondTrade` reject with `TradesUnavailableError` (same spirit as `AuthUnavailableError`), `myTradePairs` returns `[]`; it never fabricates counterparties or successes. Mock (DEV and `VITE_MOCK_WISHERS === '1'`, the same flag that previews both match sections, so one switch shows the whole trading surface): keeps proposals in memory, `myTradePairs` returns them, `respondTrade` transitions their state. Production always binds the local port. Only `proposeTrade` is consumed in Stage 3; the other two methods land with Stage 4's "Mis trades" screen. Acceptance: port tests pin honest-local rejection, the mock round-trip, and the binding gate.

S3 — Inline proposal panel ("I offer X for Y"). Roadmap quote: "a minimal "I offer X for Y" panel opened from a match", composed under the resolved product decision (2026-10-17, user choice verbatim: "Selección inline (Recomendado)"): two columns composed at proposal time, no cart. Give column: pre-selected with the matched entry when the match came from my card's detail (`WhoWants`); additions are chosen from my `forTrade` binder entries only. Ask column: the matched card (oracle identity); further asks need the counterpart's binder, which is Stage 5's public binder, so only 1:N from my side exists today. Submit is disabled while give or ask is empty; submit calls `proposeTrade` with the counterpart id; on success a toast confirms and the panel closes; a failed proposal surfaces an honest error and keeps the composition. Acceptance: pre-fill per entry point, empty-side blocking, success toast + close, failure preserves composition — each pinned RED→GREEN.

## Tasks

T1 — S2 · route inline · pending — TradesPort seam: types, honest local port, dev mock, binding, plus port tests.
T2 — S3 · route inline · pending — TradeProposalPanel: two columns, pre-fill rules, add/remove, submit gating, plus tests.
T3 — S1 · route inline · pending — Entry points: per-wisher action in `WhoWants`, offerer-face buttons in `WhoHas`, panel wiring, plus tests.

## Log

L1 (2026-10-17): user asked to continue with the roadmap ("sigamos"); Stage 3 began with the roadmap's open product decision. The user chose the composition UX verbatim: "Selección inline (Recomendado)" — a panel "ofrezco X por Y" opened from a match, two columns pre-filled with the match's card and expandable; the cart is deferred because its value depends on the Stage 5 public binder.
