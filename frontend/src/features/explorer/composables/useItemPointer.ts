import type { ExplorerItem } from '../lib/items'
import { useExplorer } from './useExplorer'

/**
 * File-manager clicks: with a mouse, click selects (Ctrl/Cmd adds, Shift extends) and
 * double-click opens; on touch screens a tap opens right away.
 */
export function useItemPointer() {
  const explorer = useExplorer()

  function onClick(item: ExplorerItem, event: MouseEvent) {
    const touch = (event as PointerEvent).pointerType === 'touch'
    if (touch && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      explorer.openItem(item)
      return
    }
    explorer.selection.select(item.id, {
      toggle: event.ctrlKey || event.metaKey,
      range: event.shiftKey,
    })
  }

  function onDoubleClick(item: ExplorerItem) {
    explorer.openItem(item)
  }

  return { onClick, onDoubleClick }
}
