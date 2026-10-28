import type { RouteLocationNormalized } from 'vue-router'

/**
 * Which page a route shows, for page transitions: all addresses inside one pickup (folders,
 * settings, people) are the same page, so moving around in the explorer doesn't animate.
 */
export function pageKey(route: Pick<RouteLocationNormalized, 'name' | 'params' | 'path'>): string {
  const pickupId = route.params.pickupId
  if (typeof pickupId === 'string' && String(route.name ?? '').startsWith('explorer')) {
    return `pickup:${pickupId}`
  }
  return String(route.name ?? route.path)
}
