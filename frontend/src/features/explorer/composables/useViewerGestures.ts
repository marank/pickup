import { computed, onBeforeUnmount, ref, type Ref } from 'vue'

import {
  clampOffset,
  clampZoom,
  distance,
  DOUBLE_TAP_ZOOM,
  dragMode,
  midpoint,
  release,
  TAP_SLOP,
  zoomAround,
  type DragMode,
  type Point,
  type Release,
} from '../lib/gestures'

const SETTLE_MS = 220
const DOUBLE_TAP_MS = 300

interface Options {
  stage: Ref<HTMLElement | null>
  /** The current picture, for its size; null for videos (no zoom, taps go to the player). */
  picture: () => HTMLElement | null
  count: () => number
  step: (delta: 1 | -1) => void
  close: () => void
}

/**
 * Touch in the media viewer: swipe sideways and the pictures follow the finger, swipe down
 * to close, pinch or double-tap to zoom, drag a zoomed picture, tap to hide the bars.
 * Mouse and keyboard keep their buttons and arrow keys.
 */
export function useViewerGestures({ stage, picture, count, step, close }: Options) {
  /** Drag of the whole strip of pictures (sideways) or of the current one (down). */
  const drag = ref<Point>({ x: 0, y: 0 })
  const scale = ref(1)
  const offset = ref<Point>({ x: 0, y: 0 })
  const animating = ref(false)
  const barsHidden = ref(false)

  const pointers = new Map<number, Point>()
  let mode: DragMode | 'ignore' | null = null
  let start: Point = { x: 0, y: 0 }
  let startTime = 0
  let startOffset: Point = { x: 0, y: 0 }
  let pinch: { distance: number; mid: Point; scale: number; offset: Point } | null = null
  let lastTap = 0
  let tapTimer: ReturnType<typeof setTimeout> | undefined
  let settleTimer: ReturnType<typeof setTimeout> | undefined

  const point = (event: PointerEvent): Point => ({ x: event.clientX, y: event.clientY })
  const box = () => stage.value?.getBoundingClientRect() ?? new DOMRect()
  /** Relative to the stage centre, the transform origin of the picture. */
  const local = (p: Point): Point => {
    const { left, top, width, height } = box()
    return { x: p.x - left - width / 2, y: p.y - top - height / 2 }
  }
  const clamped = (next: Point, zoom = scale.value): Point => {
    const content = picture()
    const { width, height } = box()
    if (!content) return { x: 0, y: 0 }
    return clampOffset(
      next,
      zoom,
      { x: content.offsetWidth, y: content.offsetHeight },
      { x: width, y: height },
    )
  }

  function animate(then?: () => void) {
    animating.value = true
    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      animating.value = false
      then?.()
    }, SETTLE_MS)
  }

  function resetZoom() {
    scale.value = 1
    offset.value = { x: 0, y: 0 }
  }

  /** After the picture changed some other way (keys, buttons). */
  function reset() {
    clearTimeout(settleTimer)
    animating.value = false
    drag.value = { x: 0, y: 0 }
    resetZoom()
  }

  function settle(outcome: Release) {
    const { width, height } = box()
    if (outcome === 'next' || outcome === 'previous') {
      drag.value = { x: outcome === 'next' ? -width : width, y: 0 }
      animate(() => {
        step(outcome === 'next' ? 1 : -1)
        reset()
      })
    } else if (outcome === 'close') {
      drag.value = { x: 0, y: height }
      animate(() => {
        close()
        reset()
      })
    } else {
      drag.value = { x: 0, y: 0 }
      animate()
    }
  }

  function tap(at: Point) {
    if (!picture()) return // videos: taps belong to the player's controls
    const now = Date.now()
    if (now - lastTap < DOUBLE_TAP_MS) {
      clearTimeout(tapTimer)
      lastTap = 0
      if (scale.value > 1) resetZoom()
      else {
        offset.value = clamped(
          zoomAround(offset.value, 1, DOUBLE_TAP_ZOOM, local(at)),
          DOUBLE_TAP_ZOOM,
        )
        scale.value = DOUBLE_TAP_ZOOM
      }
      animate()
      return
    }
    lastTap = now
    tapTimer = setTimeout(() => (barsHidden.value = !barsHidden.value), DOUBLE_TAP_MS)
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse') return
    try {
      stage.value?.setPointerCapture(event.pointerId)
    } catch {
      // not every pointer can be captured (and test DOMs can't at all)
    }
    pointers.set(event.pointerId, point(event))
    if (pointers.size === 1) {
      start = point(event)
      startTime = Date.now()
      startOffset = offset.value
      mode = null
    } else if (pointers.size === 2 && picture()) {
      const [a, b] = [...pointers.values()] as [Point, Point]
      drag.value = { x: 0, y: 0 }
      mode = 'ignore'
      pinch = {
        distance: distance(a, b),
        mid: local(midpoint(a, b)),
        scale: scale.value,
        offset: offset.value,
      }
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, point(event))
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()] as [Point, Point]
      const next = clampZoom((pinch.scale * distance(a, b)) / Math.max(pinch.distance, 1))
      offset.value = zoomAround(pinch.offset, pinch.scale, next, pinch.mid, local(midpoint(a, b)))
      scale.value = next
      return
    }
    if (pointers.size !== 1 || mode === 'ignore') return
    const d = { x: event.clientX - start.x, y: event.clientY - start.y }
    mode ??= dragMode(d.x, d.y, scale.value > 1)
    if (mode === 'pan') offset.value = clamped({ x: startOffset.x + d.x, y: startOffset.y + d.y })
    // With one picture there is nowhere to go: it only gives a little.
    else if (mode === 'swipe') drag.value = { x: count() > 1 ? d.x : d.x / 3, y: 0 }
    else if (mode === 'dismiss') drag.value = { x: 0, y: Math.max(0, d.y) }
  }

  function onPointerUp(event: PointerEvent) {
    if (!pointers.delete(event.pointerId)) return
    if (pinch) {
      if (pointers.size < 2) pinch = null
      if (scale.value < 1.05) {
        resetZoom()
        animate()
      } else offset.value = clamped(offset.value)
      return
    }
    if (pointers.size > 0 || mode === 'ignore') {
      if (pointers.size === 0) mode = null
      return
    }
    const d = { x: event.clientX - start.x, y: event.clientY - start.y }
    mode ??= dragMode(d.x, d.y, scale.value > 1)
    if (mode === null) {
      if (Math.hypot(d.x, d.y) < TAP_SLOP && event.type === 'pointerup') tap(point(event))
      return
    }
    if (mode === 'pan') return
    const outcome =
      event.type === 'pointerup'
        ? release(mode, d.x, d.y, Date.now() - startTime, box().width)
        : 'stay'
    settle(mode === 'swipe' && count() < 2 ? 'stay' : outcome)
  }

  onBeforeUnmount(() => {
    clearTimeout(tapTimer)
    clearTimeout(settleTimer)
  })

  const transition = computed(() =>
    animating.value ? `transform ${SETTLE_MS}ms ease-out` : 'none',
  )
  const stripStyle = computed(() => ({
    transform: `translate3d(${drag.value.x}px, ${drag.value.y}px, 0)`,
    transition: transition.value,
  }))
  const pictureStyle = computed(() => ({
    transform: `translate3d(${offset.value.x}px, ${offset.value.y}px, 0) scale(${scale.value})`,
    transition: transition.value,
  }))
  /** The dark background fades while the picture is pulled down. */
  const backdropOpacity = computed(() => Math.max(0.2, 1 - drag.value.y / 400))

  return {
    scale,
    barsHidden,
    stripStyle,
    pictureStyle,
    backdropOpacity,
    reset,
    handlers: {
      pointerdown: onPointerDown,
      pointermove: onPointerMove,
      pointerup: onPointerUp,
      pointercancel: onPointerUp,
    },
  }
}
