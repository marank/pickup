import { QueryClient } from '@tanstack/vue-query'

import { ApiError } from '@/api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Client errors (404 unknown pickup, 403) won't change on retry; server/network errors might.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      staleTime: 10_000,
    },
  },
})
