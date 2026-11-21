import { onBeforeUnmount, ref, type Ref } from 'vue'

import type { Explorer } from './useExplorer'

interface Box {
  left: number
  top: number
  width: number
  height: number
}

const THRESHOLD = 4 // px before a press becomes a drag
const EDGE = 32 // px from the pane edge where dragging scrolls
const SCROLL_STEP = 18

/**
 * Explorer-style rubber-band selection: press on empty space in the pane and drag.
 * Items touched by the rectangle are selected; with Ctrl/Cmd they add to the selection.
 * Near the top or bottom edge the pane scrolls, also while the mouse stands still.
 * Coordinates are relative to the pane's scrolled content, so the box scrolls with it.
 */
export function useMarquee(pane: Ref<HTMLElement | null>, explorer: Explorer) {
  const box = ref<Box | null>(null)
  let start: { x: number; y: number } | null = null
  let base = new Set<string>()
  let last: PointerEvent | null = null
  let dragged = false
  let suppressClick = false
  let timer: ReturnType<typeof setInterval> | null = null

  function contentPoint(event: PointerEvent) {
    const el = pane.value!
    const rect = el.getBoundingClientRect()
    return {
      x: event.clientX - rect.left + el.scrollLeft,
      y: event.clientY - rect.top + el.scrollTop,
    }
  }

  function select(current: Box) {
    const el = pane.value!
    const origin = el.getBoundingClientRect()
    const hit = new Set(base)
    for (const node of el.querySelectorAll<HTMLElement>('[data-item]')) {
      const r = node.getBoundingClientRect()
      const left = r.left - origin.left + el.scrollLeft
      const top = r.top - origin.top + el.scrollTop
      const overlaps =
        left < current.left + current.width &&
        left + r.width > current.left &&
        top < current.top + current.height &&
        top + r.height > current.top
      if (overlaps && node.dataset.item) hit.add(node.dataset.item)
    }
    explorer.selection.replace(hit)
  }

  function update(event: PointerEvent) {
    if (!start || !pane.value) return
    const point = contentPoint(event)
    if (!dragged && Math.hypot(point.x - start.x, point.y - start.y) < THRESHOLD) return
    dragged = true
    const current = {
      left: Math.min(start.x, point.x),
      top: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    }
    box.value = current
    select(current)
  }

  /** Scroll while the pointer is near the top or bottom edge. */
  function autoScroll() {
    if (!last || !pane.value) return
    const rect = pane.value.getBoundingClientRect()
    let delta = 0
    if (last.clientY < rect.top + EDGE) delta = -SCROLL_STEP
    else if (last.clientY > rect.bottom - EDGE) delta = SCROLL_STEP
    if (delta) {
      pane.value.scrollTop += delta
      update(last)
    }
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
    start = null
    last = null
    box.value = null
  }

  function onPointerDown(event: PointerEvent) {
    const isMouse = !event.pointerType || event.pointerType === 'mouse'
    const target = event.target as HTMLElement
    if (
      !isMouse ||
      event.button !== 0 ||
      target.closest('[data-item], button, input, a, [role="menu"]')
    )
      return
    start = contentPoint(event)
    base = event.ctrlKey || event.metaKey ? new Set(explorer.selection.selected) : new Set()
    dragged = false
    last = event
    pane.value?.setPointerCapture(event.pointerId)
    timer = setInterval(autoScroll, 30)
  }

  function onPointerMove(event: PointerEvent) {
    if (!start) return
    last = event
    update(event)
  }

  function onPointerUp() {
    if (start && dragged) suppressClick = true
    stop()
  }

  /** The click after a drag would clear the selection we just made; swallow it. */
  function onClickCapture(event: MouseEvent) {
    if (!suppressClick) return
    suppressClick = false
    event.stopPropagation()
    event.preventDefault()
  }

  onBeforeUnmount(stop)

  return { box, onPointerDown, onPointerMove, onPointerUp, onClickCapture }
}
