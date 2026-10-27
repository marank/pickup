import {
  DownloadIcon,
  FolderOpenIcon,
  ImageIcon,
  PencilIcon,
  TextIcon,
  Trash2Icon,
} from '@lucide/vue'
import type { Component } from 'vue'

import type { Explorer } from '../composables/useExplorer'
import type { ExplorerItem } from './items'

export interface ItemAction {
  id: string
  label: string
  icon: Component
  shortcut?: string
  destructive?: boolean
  run: () => void
}

/**
 * What can be done with an item, for the context menu and the "⋮" menu alike.
 * Acting on an item that is part of a multi-selection acts on the whole selection.
 */
export function itemActions(explorer: Explorer, item: ExplorerItem): ItemAction[] {
  const targets =
    explorer.selection.isSelected(item.id) && explorer.selectedItems.length > 1
      ? explorer.selectedItems
      : [item]
  const single = targets.length === 1
  const files = targets.filter((target) => target.kind === 'file')
  const actions: ItemAction[] = []

  if (single) {
    actions.push({
      id: 'open',
      label: item.kind === 'folder' ? 'Open' : 'View',
      icon: item.kind === 'folder' ? FolderOpenIcon : ImageIcon,
      shortcut: 'Enter',
      run: () => explorer.openItem(item),
    })
  }
  if (files.length) {
    actions.push({
      id: 'download',
      label: files.length > 1 ? `Download ${files.length} files` : 'Download',
      icon: DownloadIcon,
      run: () => explorer.download(files),
    })
  }
  if (single && item.editable) {
    actions.push(
      item.kind === 'folder'
        ? {
            id: 'rename',
            label: 'Rename',
            icon: PencilIcon,
            shortcut: 'F2',
            run: () => explorer.requestRename(item),
          }
        : {
            id: 'caption',
            label: 'Edit caption',
            icon: TextIcon,
            shortcut: 'F2',
            run: () => explorer.requestRename(item),
          },
    )
  }
  if (explorer.canDelete(targets)) {
    actions.push({
      id: 'delete',
      label: single ? 'Delete' : `Delete ${targets.length} items`,
      icon: Trash2Icon,
      shortcut: 'Del',
      destructive: true,
      run: () => explorer.requestDelete(targets),
    })
  }
  return actions
}
