import type { Folder, Media } from '@/api/types'
import { t } from '@/lib/i18n'

/** One entry in the content pane: a folder or a file. */
export type ExplorerItem =
  | {
      kind: 'folder'
      id: string
      name: string
      owner: string
      date: string
      size: null
      editable: boolean
      /** Owner, or the creator as moderator (never a member's top-level folder). */
      deletable: boolean
      folder: Folder
    }
  | {
      kind: 'file'
      id: string
      name: string
      owner: string
      date: string
      size: number
      editable: boolean
      deletable: boolean
      media: Media
    }

export type SortKey = 'name' | 'date' | 'size' | 'type' | 'owner'
export type SortDirection = 'asc' | 'desc'

export function folderItem(folder: Folder): ExplorerItem {
  return {
    kind: 'folder',
    id: folder.id,
    name: folder.name,
    owner: folder.user_name,
    date: folder.created_at,
    size: null,
    editable: folder.can_edit,
    deletable: folder.can_delete,
    folder,
  }
}

export function fileItem(media: Media): ExplorerItem {
  return {
    kind: 'file',
    id: media.id,
    name: media.original_filename,
    owner: media.owner_name,
    date: media.uploaded_at,
    size: media.file_size,
    editable: media.can_edit,
    deletable: media.can_delete,
    media,
  }
}

export function typeLabel(item: ExplorerItem): string {
  if (item.kind === 'folder') return t('explorer.items.folder')
  const extension = item.name.includes('.') ? item.name.split('.').pop()!.toUpperCase() : ''
  const kind = item.media.is_video ? t('common.video') : t('explorer.items.image')
  return extension ? `${kind} (${extension})` : kind
}

const compareText = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })

function compare(a: ExplorerItem, b: ExplorerItem, key: SortKey): number {
  switch (key) {
    case 'date':
      return a.date.localeCompare(b.date)
    case 'size':
      return (a.size ?? 0) - (b.size ?? 0)
    case 'type':
      return compareText(typeLabel(a), typeLabel(b))
    case 'owner':
      return compareText(a.owner, b.owner)
    case 'name':
      return compareText(a.name, b.name)
  }
}

/** Folders first (like every file manager), then by key; ties broken by name. */
export function sortItems(
  items: ExplorerItem[],
  key: SortKey,
  direction: SortDirection,
): ExplorerItem[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    return sign * compare(a, b, key) || compareText(a.name, b.name)
  })
}

export function filterItems(items: ExplorerItem[], query: string): ExplorerItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return items
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(needle) ||
      item.owner.toLowerCase().includes(needle) ||
      (item.kind === 'file' && (item.media.caption ?? '').toLowerCase().includes(needle)),
  )
}
