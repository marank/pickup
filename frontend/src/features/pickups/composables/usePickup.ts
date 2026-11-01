import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { api } from '@/api/client'
import { unwrap } from '@/api/errors'
import type { CreatePickupRequest, JoinRequest } from '@/api/types'
import { queryClient } from '@/lib/queryClient'

import { pickupKeys } from '../queryKeys'

export function usePickup(
  pickupId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  return useQuery({
    queryKey: computed(() => pickupKeys.detail(toValue(pickupId))),
    enabled: computed(() => toValue(enabled)),
    queryFn: () =>
      unwrap(api.GET('/api/pickups/{id}/', { params: { path: { id: toValue(pickupId) } } })),
  })
}

export function usePickupFolders(
  pickupId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  return useQuery({
    queryKey: computed(() => pickupKeys.folders(toValue(pickupId))),
    enabled: computed(() => toValue(enabled)),
    queryFn: () =>
      unwrap(
        api.GET('/api/pickups/{id}/folders/', { params: { path: { id: toValue(pickupId) } } }),
      ),
  })
}

export function useCreatePickup() {
  return useMutation({
    mutationFn: (body: CreatePickupRequest) => unwrap(api.POST('/api/pickups/', { body })),
  })
}

/** The signed-in member's own personal link, to copy it again. */
export function personalLinkQuery(pickupId: string) {
  return {
    queryKey: pickupKeys.link(pickupId),
    queryFn: () =>
      unwrap(api.GET('/api/pickups/{id}/session/link/', { params: { path: { id: pickupId } } })),
  }
}

export function useJoinPickup(pickupId: MaybeRefOrGetter<string>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: JoinRequest) =>
      unwrap(
        api.POST('/api/pickups/{id}/join/', {
          params: { path: { id: toValue(pickupId) } },
          body,
        }),
      ),
    // This browser is now a different member: everything about the pickup may differ.
    onSuccess: () => client.invalidateQueries({ queryKey: pickupKeys.all(toValue(pickupId)) }),
  })
}

/** Sign this browser out of the pickup; it can still look, like any visitor. */
export function useLeavePickup(pickupId: MaybeRefOrGetter<string>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () =>
      unwrap(
        api.DELETE('/api/pickups/{id}/session/', { params: { path: { id: toValue(pickupId) } } }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: pickupKeys.all(toValue(pickupId)) }),
  })
}

/** The signed-in member changes their own name and/or their folder's name. */
export function useUpdateMember(pickupId: MaybeRefOrGetter<string>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (details: { user_name?: string; folder_name?: string }) =>
      unwrap(
        api.PATCH('/api/pickups/{id}/session/', {
          params: { path: { id: toValue(pickupId) } },
          body: details,
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: pickupKeys.all(toValue(pickupId)) }),
  })
}

/** Personal link: trade the access key for a session (used by the router guard). */
export async function enterPickup(
  pickupId: string,
  accessKey: string,
  password?: string,
): Promise<void> {
  const pickup = await unwrap(
    api.POST('/api/pickups/{id}/session/', {
      params: { path: { id: pickupId } },
      body:
        password === undefined ? { access_key: accessKey } : { access_key: accessKey, password },
    }),
  )
  await queryClient.invalidateQueries({ queryKey: pickupKeys.all(pickupId) })
  queryClient.setQueryData(pickupKeys.detail(pickupId), pickup)
}

/** The intro after joining was closed: it doesn't open by itself again. */
export function useMarkIntroSeen(pickupId: MaybeRefOrGetter<string>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/api/pickups/{id}/session/intro/', {
          params: { path: { id: toValue(pickupId) } },
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: pickupKeys.detail(toValue(pickupId)) }),
  })
}
