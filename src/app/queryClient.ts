import { QueryClient } from '@tanstack/react-query'

/** Shared TanStack Query client with sensible defaults for a catalog-heavy app. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})