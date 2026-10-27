import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Pickup, Folder, Media, CreateFolderRequest } from '@/types'
import { pickupApi, folderApi, apiErrorMessage } from '@/services/api'

export const usePickupStore = defineStore('pickup', () => {
  // State
  const currentPickup = ref<Pickup | null>(null)
  const currentFolder = ref<Folder | null>(null)
  const folders = ref<Folder[]>([])
  const allMedia = ref<Media[]>([])
  const folderMedia = ref<Media[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!currentFolder.value)
  const isCreator = computed(() => currentPickup.value?.is_creator ?? false)
  const canEditCurrentFolder = computed(() => currentFolder.value?.can_edit ?? false)
  const currentFolderMedia = computed(() =>
    folderMedia.value.filter((media) => media.folder === currentFolder.value?.id),
  )

  // Actions
  const setLoading = (state: boolean) => {
    loading.value = state
  }

  const setError = (message: string | null) => {
    error.value = message
  }

  const clearError = () => {
    error.value = null
  }

  // Exchange a personal link's access key for a session in this browser
  const enterWithKey = async (pickupId: string, accessKey: string) => {
    const response = await pickupApi.enterSession(pickupId, accessKey)
    currentPickup.value = response.data
    currentFolder.value = null
    return response.data
  }

  // Pickup actions
  const loadPickup = async (pickupId: string) => {
    try {
      setLoading(true)
      clearError()
      const response = await pickupApi.getPickup(pickupId)
      currentPickup.value = response.data
      return response.data
    } catch (err) {
      const message = apiErrorMessage(err, 'Failed to load pickup')
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const joinPickup = async (pickupId: string, data: CreateFolderRequest) => {
    try {
      setLoading(true)
      clearError()
      const response = await pickupApi.joinPickup(pickupId, data)
      currentFolder.value = response.data.folder
      // The session now belongs to the new member (e.g. no longer the creator)
      currentPickup.value = (await pickupApi.getPickup(pickupId)).data
      return response.data
    } catch (err) {
      const message = apiErrorMessage(err, 'Failed to join pickup')
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const loadFolders = async (pickupId: string) => {
    try {
      setLoading(true)
      clearError()
      const response = await pickupApi.getFolders(pickupId)
      folders.value = response.data
      return response.data
    } catch (err) {
      const message = apiErrorMessage(err, 'Failed to load folders')
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const loadAllMedia = async (pickupId: string) => {
    try {
      setLoading(true)
      clearError()
      const response = await pickupApi.getAllMedia(pickupId)
      allMedia.value = response.data
      return response.data
    } catch (err) {
      const message = apiErrorMessage(err, 'Failed to load media')
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Folder actions
  const loadFolderMedia = async (pickupId: string, folderId: string) => {
    try {
      setLoading(true)
      clearError()
      const response = await folderApi.getMedia(pickupId, folderId)
      folderMedia.value = response.data
      return response.data
    } catch (err) {
      const message = apiErrorMessage(err, 'Failed to load folder media')
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearFolder = async (pickupId: string, folderId: string) => {
    try {
      setLoading(true)
      clearError()
      await folderApi.clearFolder(pickupId, folderId)
      // Clear local media for this folder
      folderMedia.value = folderMedia.value.filter((media) => media.folder !== folderId)
      // Update folder media count
      const folder = folders.value.find((f) => f.id === folderId)
      if (folder) {
        folder.media_count = 0
      }
    } catch (err) {
      const message = apiErrorMessage(err, 'Failed to clear folder')
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Media actions
  const addMedia = (media: Media) => {
    folderMedia.value.push(media)
    allMedia.value.push(media)
    // Update folder media count
    const folder = folders.value.find((f) => f.id === media.folder)
    if (folder) {
      folder.media_count += 1
    }
  }

  const removeMedia = (mediaId: string) => {
    // Look the item up before removing it, to update its folder's count
    const media = [...folderMedia.value, ...allMedia.value].find((m) => m.id === mediaId)
    folderMedia.value = folderMedia.value.filter((m) => m.id !== mediaId)
    allMedia.value = allMedia.value.filter((m) => m.id !== mediaId)
    const folder = media && folders.value.find((f) => f.id === media.folder)
    if (folder && folder.media_count > 0) {
      folder.media_count -= 1
    }
  }

  const updateMediaCaption = (mediaId: string, caption: string) => {
    const media = folderMedia.value.find((m) => m.id === mediaId)
    if (media) {
      media.caption = caption
    }
    const allMediaItem = allMedia.value.find((m) => m.id === mediaId)
    if (allMediaItem) {
      allMediaItem.caption = caption
    }
  }

  // Reset state
  const resetState = () => {
    currentPickup.value = null
    currentFolder.value = null
    folders.value = []
    allMedia.value = []
    folderMedia.value = []
    loading.value = false
    error.value = null
  }

  return {
    // State
    currentPickup,
    currentFolder,
    folders,
    allMedia,
    folderMedia,
    loading,
    error,

    // Getters
    isAuthenticated,
    isCreator,
    canEditCurrentFolder,
    currentFolderMedia,

    // Actions
    setLoading,
    setError,
    clearError,
    enterWithKey,
    loadPickup,
    joinPickup,
    loadFolders,
    loadAllMedia,
    loadFolderMedia,
    clearFolder,
    addMedia,
    removeMedia,
    updateMediaCaption,
    resetState,
  }
})
