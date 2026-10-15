/**
 * A user who wants a card. Identity only: the app has no user model, auth or
 * backend today, so the name is a display snapshot and the photo optional.
 */
export interface Wisher {
  id: string
  displayName: string
  avatarUrl?: string
}

/**
 * Port for "who wants this card". Matching is at the oracle level — a want is
 * a logical card, a binder entry is a physical printing — which is the split
 * the data model was built for. A future backend satisfies this contract
 * without touching consumers.
 */
export interface WishersPort {
  wishersOf(oracleId: string, signal?: AbortSignal): Promise<Wisher[]>
}

/**
 * Local implementation: with no backend, user model or auth there is nobody
 * to report, so it honestly returns an empty list instead of inventing users.
 */
export const localWishersPort: WishersPort = {
  wishersOf: async () => [],
}

/** Active wishers adapter. Consumers go through this binding only. */
export const wishersPort: WishersPort = localWishersPort
