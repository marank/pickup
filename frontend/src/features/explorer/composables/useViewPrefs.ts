import { ref, watch } from 'vue'

import { readPreference, writePreference } from '@/lib/storage'

import type { SortDirection, SortKey } from '../lib/items'

const VIEW_MODES = ['details', 'content', 'small', 'large'] as const
export type ViewMode = (typeof VIEW_MODES)[number]
const SORT_KEYS = ['name', 'date', 'size', 'type', 'owner'] as const
const DIRECTIONS = ['asc', 'desc'] as const

/** How the content pane looks; remembered in this browser. */
export function useViewPrefs() {
  const view = ref<ViewMode>(readPreference('pickup.view', VIEW_MODES, 'large'))
  const sortKey = ref<SortKey>(readPreference('pickup.sort', SORT_KEYS, 'name'))
  const sortDirection = ref<SortDirection>(readPreference('pickup.sortDir', DIRECTIONS, 'asc'))
  const detailsPane = ref(readPreference('pickup.details', ['on', 'off'] as const, 'on') === 'on')

  watch(view, (value) => writePreference('pickup.view', value))
  watch(sortKey, (value) => writePreference('pickup.sort', value))
  watch(sortDirection, (value) => writePreference('pickup.sortDir', value))
  watch(detailsPane, (value) => writePreference('pickup.details', value ? 'on' : 'off'))

  /** Click on a column header: same key flips the direction, a new key sorts ascending. */
  function sortBy(key: SortKey) {
    if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    else {
      sortKey.value = key
      sortDirection.value = 'asc'
    }
  }

  return { view, sortKey, sortDirection, detailsPane, sortBy }
}
