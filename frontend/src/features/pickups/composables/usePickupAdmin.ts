import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { api } from '@/api/client'
import { unwrap } from '@/api/errors'
import type { PickupSettings } from '@/api/types'

import { pickupKeys } from '../queryKeys'

type Id = MaybeRefOrGetter<string>

/** The creator's tools: settings, participants, invitations. */
export function usePickupAdmin(pickupId: Id, enabled: MaybeRefOrGetter<boolean> = true) {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: pickupKeys.all(toValue(pickupId)) })
  const pickupPath = () => ({ path: { pickup_id: toValue(pickupId) } })
  const memberPath = (id: string) => ({ path: { pickup_id: toValue(pickupId), id } })

  const members = useQuery({
    queryKey: computed(() => pickupKeys.members(toValue(pickupId))),
    enabled: computed(() => toValue(enabled)),
    queryFn: () => unwrap(api.GET('/api/pickups/{pickup_id}/members/', { params: pickupPath() })),
  })

  return {
    members,
    updateSettings: useMutation({
      mutationFn: (changes: PickupSettings) =>
        unwrap(
          api.PATCH('/api/pickups/{id}/', {
            params: { path: { id: toValue(pickupId) } },
            body: changes,
          }),
        ),
      onSuccess: refresh,
    }),
    invite: useMutation({
      mutationFn: (body: { email: string; name?: string }) =>
        unwrap(api.POST('/api/pickups/{pickup_id}/members/', { params: pickupPath(), body })),
      onSuccess: refresh,
    }),
    resend: useMutation({
      mutationFn: (memberId: string) =>
        unwrap(
          api.POST('/api/pickups/{pickup_id}/members/{id}/resend/', {
            params: memberPath(memberId),
          }),
        ),
    }),
    remove: useMutation({
      mutationFn: (memberId: string) =>
        unwrap(
          api.DELETE('/api/pickups/{pickup_id}/members/{id}/', { params: memberPath(memberId) }),
        ),
      onSuccess: refresh,
    }),
  }
}

/** Anyone: mail me my personal link (if this address is in the pickup). */
export function useRequestLink(pickupId: Id) {
  return useMutation({
    mutationFn: (email: string) =>
      unwrap(
        api.POST('/api/pickups/{id}/link-request/', {
          params: { path: { id: toValue(pickupId) } },
          body: { email },
        }),
      ),
  })
}

/** Signed-in participant: store my address and mail me my link. */
export function useSetEmail(pickupId: Id) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (email: string) =>
      unwrap(
        api.POST('/api/pickups/{id}/session/email/', {
          params: { path: { id: toValue(pickupId) } },
          body: { email },
        }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: pickupKeys.members(toValue(pickupId)) }),
  })
}
