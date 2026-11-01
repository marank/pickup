import { computed, inject, provide, reactive, ref, watch, type InjectionKey } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import { formatFileSize } from '@/lib/format'
import { t } from '@/lib/i18n'
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
  | { kind: 'caption'; media: Media }
  | { kind: 'delete'; items: ExplorerItem[] }
  | { kind: 'share' }

/** Pages of the pickup itself, shown in the content pane instead of a folder. */
export type ExplorerPage = 'settings' | 'people'

function folderRoute(pickupId: string, folderId: string | null) {
  return folderId
    ? { name: 'explorer-folder', params: { pickupId, folderId } }
    : { name: 'explorer', params: { pickupId } }
}

function createExplorer(
  pickupId: () => string,
  folderId: () => string | null,
  page: () => ExplorerPage | null,
) {
  const router = useRouter()
  const pickup = usePickup(pickupId)
  /** Private pickups show outsiders only a join page; don't even ask for their contents. */
  const canView = computed(() => pickup.data.value?.can_view ?? false)
  const folders = usePickupFolders(pickupId, canView)
  const media = useFolderMedia(pickupId, folderId, canView)
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
    () => childrenOf(tree.value, null).find((folder) => folder.is_own) ?? null,
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
    if (id === folderId() && !page()) return
    void router.push(folderRoute(pickupId(), id))
  }
  function openPage(target: ExplorerPage) {
    if (target !== page())
      void router.push({ name: 'explorer-page', params: { pickupId: pickupId(), page: target } })
  }
  const goUp = () => navigate(current.value?.parent ?? null)
  const goBack = () => router.back()
  const goForward = () => router.forward()

  /** Typed path in the address bar; returns false if it doesn't exist. */
  function navigateToPath(text: string): boolean {
    const title = pickup.data.value?.title || t('Untitled pickup')
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
      toast.error(t('You can only upload into your own folders.'))
      return
    }
    let free = freeSpace()
    const accepted = list.filter((file) => {
      // iPhone photos (HEIC) come without a type in some browsers.
      const ok =
        file.type.startsWith('image/') ||
        file.type.startsWith('video/') ||
        /\.(heic|heif)$/i.test(file.name)
      if (!ok) toast.error(t('{name} is not a photo or video', { name: file.name }))
      else if (free !== null && file.size > free) {
        toast.error(
          t("{name} doesn't fit: {free} of storage left", {
            name: file.name,
            free: formatFileSize(Math.max(free, 0)),
          }),
        )
        return false
      } else if (free !== null) free -= file.size
      return ok
    })
    for (const file of accepted) void uploads.add(file, target.id)
    if (accepted.length && target.id !== folderId()) navigate(target.id)
  }

  /**
   * Bytes this member may still upload (null: no limit), minus files waiting in the queue.
   * The server checks again; this only spares people a transfer that would be refused.
   */
  function freeSpace(): number | null {
    const storage = pickup.data.value?.storage
    if (!storage) return null
    const room = [
      storage.limit === null ? null : storage.limit - storage.used,
      storage.own_limit === null || storage.own_used === null
        ? null
        : storage.own_limit - storage.own_used,
    ].filter((value): value is number => value !== null)
    if (!room.length) return null
    const waiting = uploads.items.value
      .filter((item) => item.status === 'pending')
      .reduce((sum, item) => sum + item.file.size, 0)
    return Math.min(...room) - waiting
  }

  const canChange = (list: ExplorerItem[]) => list.length > 0 && list.every((item) => item.editable)
  /** Owners delete their own things, the creator anything (moderation); never a top-level folder. */
  const canDelete = (list: ExplorerItem[]) =>
    list.length > 0 && list.every((item) => item.deletable)

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
          t('“{name}” deleted', { name: item.name }),
          t('Could not delete the folder'),
        )
      } else {
        await run(
          mutations.deleteMedia.mutateAsync(item.media),
          t('“{name}” deleted', { name: item.name }),
          t('Could not delete the file'),
        )
      }
    }
    selection.clear()
  }

  function save(href: string, name = '') {
    const link = document.createElement('a')
    link.href = href
    link.download = name
    link.click()
  }

  /** One file as it is; several items, or folders, as one ZIP built by the server. */
  function download(list: ExplorerItem[]) {
    const only = list.length === 1 ? list[0]! : null
    if (only?.kind === 'file') return save(only.media.file, only.media.original_filename)
    const ids = (kind: ExplorerItem['kind']) =>
      list
        .filter((item) => item.kind === kind)
        .map((item) => item.id)
        .join(',')
    const query = new URLSearchParams({ folders: ids('folder'), media: ids('file') })
    save(`/api/pickups/${pickupId()}/download/?${query}`)
  }

  /** The current folder with everything inside, or at the top the whole pickup. */
  function downloadAll() {
    const id = folderId()
    save(`/api/pickups/${pickupId()}/download/${id ? `?folders=${id}` : ''}`)
  }

  return reactive({
    pickupId: computed(pickupId),
    folderId: computed(folderId),
    page: computed(page),
    pickup,
    canView,
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
    openPage,
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
    downloadAll,
    run,
  })
}

export type Explorer = ReturnType<typeof createExplorer>

const KEY: InjectionKey<Explorer> = Symbol('explorer')

export function provideExplorer(
  pickupId: () => string,
  folderId: () => string | null,
  page: () => ExplorerPage | null = () => null,
): Explorer {
  const explorer = createExplorer(pickupId, folderId, page)
  provide(KEY, explorer)
  return explorer
}

export function useExplorer(): Explorer {
  const explorer = inject(KEY)
  if (!explorer) throw new Error('useExplorer() outside of the explorer')
  return explorer
}
