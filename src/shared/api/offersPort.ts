/**
 * A user who has a card available for trade. Identity plus the shape of their
 * offer: how many for-trade copies they hold. Matching and ordering are the
 * backend's job, so this is the data the API already resolved — the UI only
 * projects it.
 */
export interface Offerer {
  id: string
  displayName: string
  avatarUrl?: string
  /** How many for-trade copies of this card the user holds. */
  offersCopies: number
}

/**
 * Port for "who has this card", the inverse of `WishersPort.wishersOf`. The
 * offer side reads a user's binder entries flagged `for_trade`, still matched
 * at the oracle level. A future backend satisfies this contract without
 * touching consumers.
 */
export interface OffersPort {
  offersOf(oracleId: string, signal?: AbortSignal): Promise<Offerer[]>
}

/**
 * Local implementation: with no backend, user model or auth there is nobody
 * to report, so it honestly returns an empty list instead of inventing users.
 */
export const localOffersPort: OffersPort = {
  offersOf: async () => [],
}

/**
 * Dev-only mock so the "La tienen" section can be previewed before the API
 * exists. It is selected only in dev and only when VITE_MOCK_WISHERS=1 — the
 * same flag that previews "La buscan", so one switch shows both matching
 * sections — keeping the honest empty port the default and ensuring production
 * never ships invented users. The list is deliberately ordered so a client-side
 * re-sort would visibly reorder it, keeping the UI's "no client re-sort"
 * contract obvious.
 */
export const mockOffersPort: OffersPort = {
  offersOf: async () => [
    {
      id: 'o-first',
      displayName: 'Diego',
      offersCopies: 3,
    },
    {
      id: 'o-second',
      displayName: 'Elena',
      avatarUrl: 'https://i.pravatar.cc/64?img=32',
      offersCopies: 1,
    },
    {
      id: 'o-third',
      displayName: 'Facundo',
      offersCopies: 2,
    },
  ],
}

/**
 * Active offers adapter. Consumers go through this binding only. The mock is
 * gated behind both DEV and an explicit opt-in flag: a production build always
 * resolves to the honest empty port regardless of the flag.
 */
export const offersPort: OffersPort =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_WISHERS === '1'
    ? mockOffersPort
    : localOffersPort
