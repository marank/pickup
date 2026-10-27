import { computed, inject, provide, reactive, ref, watch, type InjectionKey } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { Folder, Media } from '@/api/types'
import { usePickup, usePickupFolders } from '@/features/pickups/composables/usePickup'

import { buildTree, childrenOf, findByPath, pathTo } from '../lib/tree'
import { fileItem, filterItems, folderItem, sortItems, type ExplorerItem } from '../lib/items'
import { useExplorerMutations, useFolderMedia } from './useExplorerData'
import { useSelection } from './useSelection'
import { useUploadQueue } from './useUploadQueue'
import { useViewPrefs } from './useViewPrefs'

/** Dialogs the explorer can open; one at a time. */
type ExplorerDialog =
  | { kind: 'new-folder'; parentId: string }
  | { kind: 'rename-folder'; folder: Folder }
  | { kind: 'rename-pickup'; title: string }
  | { kind: 'caption'; media: Media }
  | { kind: 'delete'; items: ExplorerItem[] }
  | { kind: 'share' }

function folderRoute(pickupId: string, folderId: string | null) {
  return folderId
    ? { name: 'explorer-folder', params: { pickupId, folderId } }
    : { name: 'explorer', params: { pickupId } }
}

function createExplorer(pickupId: () => string, folderId: () => string | null) {
  const router = useRouter()
  const pickup = usePickup(pickupId)
  const folders = usePickupFolders(pickupId)
  const media = useFolderMedia(pickupId, folderId)
  const mutations = useExplorerMutations(pickupId)
  const uploads = useUploadQueue(pickupId)
  const prefs = useViewPrefs()

  const tree = computed(() => buildTree(folders.data.value ?? []))
  const current = computed(() => {
    const id = folderId()
    return id ? (tree.value.byId.get(id) ?? null) : null
  })
  const path = computed(() => pathTo(tree.value, folderId()))
  const ownFolder = computed(
    () => childrenOf(tree.value, null).find((folder) => folder.can_edit) ?? null,
  )
  const isMember = computed(() => ownFolder.value !== null)
  const canEditHere = computed(() => current.value?.can_edit ?? false)
  /** Current folder unknown once folders are loaded: deleted, or a wrong link. */
  const missingFolder = computed(
    () => folderId() !== null && folders.isSuccess.value && !current.value,
  )

  const search = ref('')
  watch(folderId, () => (search.value = ''))

  const allItems = computed<ExplorerItem[]>(() => [
    ...childrenOf(tree.value, folderId()).map(folderItem),
    ...(folderId() ? (media.data.value ?? []).map(fileItem) : []),
  ])
  const items = computed(() =>
    sortItems(
      filterItems(allItems.value, search.value),
      prefs.sortKey.value,
      prefs.sortDirection.value,
    ),
  )
  const selection = useSelection(() => items.value.map((item) => item.id))
  watch(items, () => selection.prune())
  watch(folderId, () => selection.clear())
  const selectedItems = computed(() => items.value.filter((item) => selection.isSelected(item.id)))
  const files = computed(() => items.value.filter((item) => item.kind === 'file'))

  const loading = computed(
    () => folders.isPending.value || (folderId() !== null && media.isPending.value),
  )

  // --- navigation -----------------------------------------------------------------
  const historyState = () => router.options.history.state as { back?: unknown; forward?: unknown }
  const canGoBack = ref(false)
  const canGoForward = ref(false)
  watch(
    () => router.currentRoute.value.fullPath,
    () => {
      canGoBack.value = Boolean(historyState().back)
      canGoForward.value = Boolean(historyState().forward)
    },
    { immediate: true },
  )

  function navigate(id: string | null) {
    if (id === folderId()) return
    void router.push(folderRoute(pickupId(), id))
  }
  const goUp = () => navigate(current.value?.parent ?? null)
  const goBack = () => router.back()
  const goForward = () => router.forward()

  /** Typed path in the address bar; returns false if it doesn't exist. */
  function navigateToPath(text: string): boolean {
    const title = pickup.data.value?.title || 'Untitled pickup'
    const trimmed = text.trim().replace(/^\/+/, '')
    // The address bar shows the pickup title as first segment; accept it but don't require it.
    const withoutTitle = trimmed.toLowerCase().startsWith(title.toLowerCase())
      ? trimmed.slice(title.length)
      : trimmed
    const target = findByPath(tree.value, withoutTitle)
    if (target === undefined) return false
    navigate(target?.id ?? null)
    return true
  }

  // --- items ----------------------------------------------------------------------
  const viewer = reactive<{ open: boolean; index: number }>({ open: false, index: 0 })

  function openItem(item: ExplorerItem) {
    if (item.kind === 'folder') navigate(item.id)
    else {
      viewer.index = Math.max(
        0,
        files.value.findIndex((file) => file.id === item.id),
      )
      viewer.open = true
    }
  }

  // --- dialogs & actions ------------------------------------------------------------
  const dialog = ref<ExplorerDialog | null>(null)
  const closeDialog = () => (dialog.value = null)

  const fileInput = ref<HTMLInputElement | null>(null)

  /** Upload target: the current folder if it's ours, else our own folder (from the root). */
  const uploadTarget = computed(() =>
    canEditHere.value ? current.value : folderId() === null ? ownFolder.value : null,
  )

  function addFiles(list: File[]) {
    const target = uploadTarget.value
    if (!target) {
      toast.error('You can only upload into your own folders.')
      return
    }
    const accepted = list.filter((file) => {
      const ok = file.type.startsWith('image/') || file.type.startsWith('video/')
      if (!ok) toast.error(`${file.name} is not a photo or video`)
      return ok
    })
    for (const file of accepted) void uploads.add(file, target.id)
    if (accepted.length && target.id !== folderId()) navigate(target.id)
  }

  const canChange = (list: ExplorerItem[]) => list.length > 0 && list.every((item) => item.editable)
  const isTopLevel = (item: ExplorerItem) => item.kind === 'folder' && item.folder.parent === null
  /** Deletable: own items, except a member's top-level folder (that's their membership). */
  const canDelete = (list: ExplorerItem[]) => canChange(list) && !list.some(isTopLevel)

  function requestRename(item: ExplorerItem) {
    if (!item.editable) return
    dialog.value =
      item.kind === 'folder'
        ? { kind: 'rename-folder', folder: item.folder }
        : { kind: 'caption', media: item.media }
  }

  function requestDelete(list: ExplorerItem[]) {
    if (canDelete(list)) dialog.value = { kind: 'delete', items: list }
  }

  function requestNewFolder() {
    if (canEditHere.value && current.value)
      dialog.value = { kind: 'new-folder', parentId: current.value.id }
  }

  async function run<T>(
    promise: Promise<T>,
    success: string,
    failure: string,
  ): Promise<T | undefined> {
    try {
      const result = await promise
      toast.success(success)
      return result
    } catch (err) {
      toast.error(apiErrorMessage(err, failure))
      return undefined
    }
  }

  async function confirmDelete(list: ExplorerItem[]) {
    closeDialog()
    for (const item of list) {
      if (item.kind === 'folder') {
        await run(
          mutations.deleteFolder.mutateAsync(item.id),
          `“${item.name}” deleted`,
          'Could not delete the folder',
        )
      } else {
        await run(
          mutations.deleteMedia.mutateAsync(item.media),
          `“${item.name}” deleted`,
          'Could not delete the file',
        )
      }
    }
    selection.clear()
  }

  function download(list: ExplorerItem[]) {
    for (const item of list) {
      if (item.kind !== 'file') continue
      const link = document.createElement('a')
      link.href = item.media.file
      link.download = item.media.original_filename
      link.click()
    }
  }

  return reactive({
    pickupId: computed(pickupId),
    folderId: computed(folderId),
    pickup,
    folders,
    tree,
    current,
    path,
    ownFolder,
    isMember,
    canEditHere,
    missingFolder,
    loading,
    search,
    items,
    files,
    selection,
    selectedItems,
    prefs,
    uploads,
    mutations,
    viewer,
    dialog,
    fileInput,
    uploadTarget,
    canGoBack,
    canGoForward,
    navigate,
    goUp,
    goBack,
    goForward,
    navigateToPath,
    openItem,
    addFiles,
    canChange,
    canDelete,
    requestRename,
    requestDelete,
    requestNewFolder,
    closeDialog,
    confirmDelete,
    download,
    run,
  })
}

export type Explorer = ReturnType<typeof createExplorer>

const KEY: InjectionKey<Explorer> = Symbol('explorer')

export function provideExplorer(pickupId: () => string, folderId: () => string | null): Explorer {
  const explorer = createExplorer(pickupId, folderId)
  provide(KEY, explorer)
  return explorer
}

export function useExplorer(): Explorer {
  const explorer = inject(KEY)
  if (!explorer) throw new Error('useExplorer() outside of the explorer')
  return explorer
}
