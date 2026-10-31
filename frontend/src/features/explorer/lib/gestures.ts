/** Touch gestures of the media viewer: plain geometry, no DOM. */

export interface Point {
  x: number
  y: number
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4
export const DOUBLE_TAP_ZOOM = 2.5
/** Below this a finger hasn't moved: a tap, not a drag. */
export const TAP_SLOP = 10

export type DragMode = 'swipe' | 'dismiss' | 'pan'
export type Release = 'next' | 'previous' | 'close' | 'stay'

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
export const clampZoom = (scale: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))

/** What a one-finger drag does, decided once it has moved past TAP_SLOP. */
export function dragMode(dx: number, dy: number, zoomed: boolean): DragMode | null {
  if (Math.hypot(dx, dy) < TAP_SLOP) return null
  if (zoomed) return 'pan'
  if (Math.abs(dx) >= Math.abs(dy)) return 'swipe'
  return dy > 0 ? 'dismiss' : null // upwards does nothing
}

/**
 * Where a released drag goes: far enough (a fifth of the width, 100 px down) or fast enough
 * (a flick) moves on or closes, anything else springs back.
 */
export function release(
  mode: DragMode,
  dx: number,
  dy: number,
  ms: number,
  width: number,
): Release {
  const fast = (d: number) => Math.abs(d) / Math.max(ms, 1) > 0.5
  if (mode === 'swipe' && (Math.abs(dx) > Math.max(40, width / 5) || fast(dx)))
    return dx < 0 ? 'next' : 'previous'
  if (mode === 'dismiss' && (dy > 100 || (dy > 30 && fast(dy)))) return 'close'
  return 'stay'
}

/**
 * Zoom from `scale` to `next` so the content under `from` ends up under `to` (both relative
 * to the stage centre, which is the transform origin). For a pinch, `from` is where the
 * fingers started and `to` where they are now, so it zooms and pans at once.
 */
export function zoomAround(
  offset: Point,
  scale: number,
  next: number,
  from: Point,
  to: Point = from,
): Point {
  const ratio = next / scale
  return { x: to.x - (from.x - offset.x) * ratio, y: to.y - (from.y - offset.y) * ratio }
}

/** Keep a zoomed picture covering the stage: no panning past its edges. */
export function clampOffset(offset: Point, scale: number, content: Point, stage: Point): Point {
  const limit = (size: number, room: number) => Math.max(0, (size * scale - room) / 2)
  const clamp = (value: number, max: number) => Math.min(max, Math.max(-max, value))
  return {
    x: clamp(offset.x, limit(content.x, stage.x)),
    y: clamp(offset.y, limit(content.y, stage.y)),
  }
}
