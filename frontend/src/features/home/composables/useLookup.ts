import { useMutation } from '@tanstack/vue-query'

import { api } from '@/api/client'
import { unwrap } from '@/api/errors'

/** Lost links: the server mails the address every live pickup it belongs to. */
export function useLookup() {
  return useMutation({
    mutationFn: (email: string) => unwrap(api.POST('/api/pickups/lookup/', { body: { email } })),
  })
}
