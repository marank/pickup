import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { api } from '@/api/client'
import { unwrap } from '@/api/errors'
import type { Media } from '@/api/types'
import { pickupKeys } from '@/features/pickups/queryKeys'

type Id = MaybeRefOrGetter<string>

/** Files directly in a folder (null: the pickup root, which holds only folders). */
export function useFolderMedia(pickupId: Id, folderId: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => pickupKeys.folderMedia(toValue(pickupId), toValue(folderId) ?? '')),
    enabled: computed(() => toValue(folderId) !== null),
    queryFn: () =>
      unwrap(
        api.GET('/api/pickups/{pickup_id}/folders/{id}/media/', {
          params: { path: { pickup_id: toValue(pickupId), id: toValue(folderId)! } },
        }),
      ),
  })
}

/** Everything a member can change in the explorer; each refreshes the whole pickup. */
export function useExplorerMutations(pickupId: Id) {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: pickupKeys.all(toValue(pickupId)) })
  const folderPath = (id: string) => ({ path: { pickup_id: toValue(pickupId), id } })
  const mediaPath = (media: Media) => ({
    path: { pickup_id: toValue(pickupId), folder_id: media.folder, id: media.id },
  })

  return {
    createFolder: useMutation({
      mutationFn: ({ parentId, name }: { parentId: string; name: string }) =>
        unwrap(
          api.POST('/api/pickups/{pickup_id}/folders/{id}/subfolders/', {
            params: folderPath(parentId),
            body: { name },
          }),
        ),
      onSuccess: refresh,
    }),
    renameFolder: useMutation({
      mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
        unwrap(
          api.PATCH('/api/pickups/{pickup_id}/folders/{id}/', {
            params: folderPath(folderId),
            body: { name },
          }),
        ),
      onSuccess: refresh,
    }),
    deleteFolder: useMutation({
      mutationFn: (folderId: string) =>
        unwrap(
          api.DELETE('/api/pickups/{pickup_id}/folders/{id}/', { params: folderPath(folderId) }),
        ),
      onSuccess: refresh,
    }),
    updateCaption: useMutation({
      mutationFn: ({ media, caption }: { media: Media; caption: string }) =>
        unwrap(
          api.PATCH('/api/pickups/{pickup_id}/folders/{folder_id}/media/{id}/caption/', {
            params: mediaPath(media),
            body: { caption },
          }),
        ),
      onSuccess: refresh,
    }),
    deleteMedia: useMutation({
      mutationFn: (media: Media) =>
        unwrap(
          api.DELETE('/api/pickups/{pickup_id}/folders/{folder_id}/media/{id}/', {
            params: mediaPath(media),
          }),
        ),
      onSuccess: refresh,
    }),
    renamePickup: useMutation({
      mutationFn: (title: string) =>
        unwrap(
          api.PATCH('/api/pickups/{id}/', {
            params: { path: { id: toValue(pickupId) } },
            body: { title },
          }),
        ),
      onSuccess: refresh,
    }),
  }
}
