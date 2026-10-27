import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { api } from '@/api/client'
import { unwrap } from '@/api/errors'
import { pickupKeys } from '@/features/pickups/queryKeys'

type Id = MaybeRefOrGetter<string>

export function useFolder(pickupId: Id, folderId: Id) {
  return useQuery({
    queryKey: computed(() => pickupKeys.folder(toValue(pickupId), toValue(folderId))),
    queryFn: () =>
      unwrap(
        api.GET('/api/pickups/{pickup_id}/folders/{id}/', {
          params: { path: { pickup_id: toValue(pickupId), id: toValue(folderId) } },
        }),
      ),
  })
}

export function useFolderMedia(pickupId: Id, folderId: Id) {
  return useQuery({
    queryKey: computed(() => pickupKeys.folderMedia(toValue(pickupId), toValue(folderId))),
    queryFn: () =>
      unwrap(
        api.GET('/api/pickups/{pickup_id}/folders/{id}/media/', {
          params: { path: { pickup_id: toValue(pickupId), id: toValue(folderId) } },
        }),
      ),
  })
}

/** Caption edits, deletes and clearing for the owner of a folder. */
export function useFolderMutations(pickupId: Id, folderId: Id) {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: pickupKeys.all(toValue(pickupId)) })
  const mediaPath = (mediaId: string) => ({
    path: { pickup_id: toValue(pickupId), folder_id: toValue(folderId), id: mediaId },
  })

  const updateCaption = useMutation({
    mutationFn: ({ mediaId, caption }: { mediaId: string; caption: string }) =>
      unwrap(
        api.PATCH('/api/pickups/{pickup_id}/folders/{folder_id}/media/{id}/caption/', {
          params: mediaPath(mediaId),
          body: { caption },
        }),
      ),
    onSuccess: refresh,
  })

  const deleteMedia = useMutation({
    mutationFn: (mediaId: string) =>
      unwrap(
        api.DELETE('/api/pickups/{pickup_id}/folders/{folder_id}/media/{id}/', {
          params: mediaPath(mediaId),
        }),
      ),
    onSuccess: refresh,
  })

  const clearFolder = useMutation({
    mutationFn: () =>
      unwrap(
        api.DELETE('/api/pickups/{pickup_id}/folders/{id}/clear/', {
          params: { path: { pickup_id: toValue(pickupId), id: toValue(folderId) } },
        }),
      ),
    onSuccess: refresh,
  })

  return { updateCaption, deleteMedia, clearFolder }
}
