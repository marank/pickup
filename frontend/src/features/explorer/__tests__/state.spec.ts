import { afterEach, describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'

import { useSelection } from '@/features/explorer/composables/useSelection'
import { useViewPrefs } from '@/features/explorer/composables/useViewPrefs'

afterEach(() => localStorage.clear())

describe('useSelection', () => {
  it('selects, toggles, extends ranges and prunes like a file manager', () => {
    const ids = ref(['a', 'b', 'c', 'd'])
    const selection = useSelection(ids)
    selection.select('b')
    expect([...selection.selected.value]).toEqual(['b'])
    selection.select('d', { range: true })
    expect([...selection.selected.value]).toEqual(['b', 'c', 'd'])
    selection.select('a', { toggle: true })
    selection.select('c', { toggle: true })
    expect(selection.count.value).toBe(3)
    expect(selection.isSelected('c')).toBe(false)

    ids.value = ['a', 'b']
    selection.prune()
    expect([...selection.selected.value].sort()).toEqual(['a', 'b'])
    selection.prune()
    expect(selection.count.value).toBe(2)

    selection.selectAll()
    expect(selection.count.value).toBe(2)
    selection.clear()
    selection.select('b', { range: true }) // no anchor yet: plain select
    expect([...selection.selected.value]).toEqual(['b'])
    selection.select('zzz', { range: true }) // anchor gone from the list
    expect([...selection.selected.value]).toEqual(['zzz'])
  })
})

describe('useViewPrefs', () => {
  it('remembers view and sorting, and flips direction on the same column', async () => {
    const prefs = useViewPrefs()
    expect(prefs.view.value).toBe('large')
    prefs.view.value = 'details'
    prefs.sortBy('size')
    prefs.sortBy('size')
    prefs.detailsPane.value = false
    await nextTick()
    expect(localStorage.getItem('pickup.view')).toBe('details')
    expect(localStorage.getItem('pickup.sort')).toBe('size')
    expect(localStorage.getItem('pickup.sortDir')).toBe('desc')
    expect(localStorage.getItem('pickup.details')).toBe('off')

    const again = useViewPrefs()
    expect([
      again.view.value,
      again.sortKey.value,
      again.sortDirection.value,
      again.detailsPane.value,
    ]).toEqual(['details', 'size', 'desc', false])
    again.sortBy('name')
    expect([again.sortKey.value, again.sortDirection.value]).toEqual(['name', 'asc'])
  })

  it('ignores unknown stored values', () => {
    localStorage.setItem('pickup.view', 'cinema')
    expect(useViewPrefs().view.value).toBe('large')
  })
})
