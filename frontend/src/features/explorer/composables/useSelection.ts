import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'

interface SelectOptions {
  /** Ctrl/Cmd: add or remove one item. */
  toggle?: boolean
  /** Shift: select the range from the last clicked item. */
  range?: boolean
}

/** File-manager selection over an ordered list of ids. */
export function useSelection(orderedIds: MaybeRefOrGetter<string[]>) {
  const selected = ref(new Set<string>())
  let anchor: string | null = null

  function select(id: string, { toggle = false, range = false }: SelectOptions = {}) {
    const ids = toValue(orderedIds)
    if (range && anchor !== null) {
      const [from, to] = [ids.indexOf(anchor), ids.indexOf(id)].sort((a, b) => a - b)
      if (from! >= 0) {
        selected.value = new Set(ids.slice(from, to! + 1))
        return
      }
    }
    anchor = id
    if (toggle) {
      const next = new Set(selected.value)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      selected.value = next
    } else {
      selected.value = new Set([id])
    }
  }

  function selectAll() {
    selected.value = new Set(toValue(orderedIds))
  }

  function clear() {
    selected.value = new Set()
    anchor = null
  }

  /** Drop ids that are no longer listed (after navigation or deletion). */
  function prune() {
    const ids = new Set(toValue(orderedIds))
    const kept = [...selected.value].filter((id) => ids.has(id))
    if (kept.length !== selected.value.size) selected.value = new Set(kept)
  }

  const count = computed(() => selected.value.size)
  const isSelected = (id: string) => selected.value.has(id)

  return { selected, count, isSelected, select, selectAll, clear, prune }
}
