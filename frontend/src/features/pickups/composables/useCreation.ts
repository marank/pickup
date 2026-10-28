import { useQuery } from '@tanstack/vue-query'
import { ref } from 'vue'

import { api } from '@/api/client'
import { unwrap } from '@/api/errors'

/** Who may create pickups on this server (PICKUP_CREATION): everyone, with a code, nobody. */
export function useCreationMode() {
  return useQuery({
    queryKey: ['creation'],
    queryFn: () => unwrap(api.GET('/api/pickups/creation/')),
    staleTime: Infinity,
  })
}

/** Check a creation code before the create page opens; throws ApiError when it isn't valid. */
export async function checkCreationCode(code: string): Promise<void> {
  await unwrap(api.POST('/api/pickups/creation/', { body: { code } }))
}

/**
 * The accepted code, only in memory on the way from the dialog to the create page: it is
 * sent with the new pickup and then forgotten, and a reload asks for it again.
 */
export const creationCode = ref('')
