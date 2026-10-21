import { apiConfigured } from '@/shared/api/apiClient'
import { apiWishersPort } from '@/shared/api/apiMatchPorts'

/**
 * A user who wants a card. Identity plus the shape of their want: how many
 * copies they seek. Matching and ordering are the backend's job, so this is
 * the data the API already resolved — the UI only projects it.
 */
export interface Wisher {
  id: string
  displayName: string
  avatarUrl?: string
  /** How many copies of this card the user is looking for. */
  wantsCopies: number
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

/**
 * Dev-only mock so the "La buscan" section can be previewed before the API
 * exists. It is selected only in dev and only when VITE_MOCK_WISHERS=1, so the
 * honest empty port stays the default and production never ships invented
 * users. The list is deliberately ordered so a client-side re-sort would
 * visibly reorder it, keeping the UI's "no client re-sort" contract obvious.
 */
export const mockWishersPort: WishersPort = {
  wishersOf: async () => [
    {
      id: 'm-low',
      displayName: 'Zeta',
      wantsCopies: 1,
    },
    {
      id: 'm-normal',
      displayName: 'Bruno',
      avatarUrl: 'https://i.pravatar.cc/64?img=12',
      wantsCopies: 2,
    },
    {
      id: 'm-high',
      displayName: 'Ana',
      wantsCopies: 4,
    },
    {
      id: 'm-high-2',
      displayName: 'Carla',
      wantsCopies: 1,
    },
  ],
}

/**
 * Active wishers adapter. Consumers go through this binding only. binder-api
 * wins whenever `VITE_API_URL` is configured. Otherwise the mock is
 * gated behind both DEV and an explicit opt-in flag: a production build always
 * resolves to the honest empty port regardless of the flag.
 */
export const wishersPort: WishersPort = apiConfigured
  ? apiWishersPort
  : import.meta.env.DEV && import.meta.env.VITE_MOCK_WISHERS === '1'
    ? mockWishersPort
    : localWishersPort
