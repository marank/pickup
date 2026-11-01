import type { ExplorerItem } from './items'

type FileItem = Extract<ExplorerItem, { kind: 'file' }>

/** Photos taken close together: a new moment starts after a longer pause. */
interface Moment {
  start: Date
  items: FileItem[]
}

export interface Day {
  /** Local calendar day, YYYY-MM-DD (also the anchor id). */
  key: string
  date: Date
  moments: Moment[]
  count: number
  /** Who added photos that day, in the order they first appear. */
  people: string[]
}

const MOMENT_GAP_MINUTES = 45

export const takenAt = (item: FileItem) => new Date(item.media.taken_at ?? item.media.uploaded_at)

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Files (already in the order they were taken) as days of moments, in the viewer's time zone. */
export function timelineDays(items: FileItem[], gapMinutes = MOMENT_GAP_MINUTES): Day[] {
  const days: Day[] = []
  let last: Date | null = null
  for (const item of items) {
    const when = takenAt(item)
    const key = dayKey(when)
    let day = days.at(-1)
    if (!day || day.key !== key) {
      day = { key, date: when, moments: [], count: 0, people: [] }
      days.push(day)
      last = null
    }
    const moment = day.moments.at(-1)
    if (!moment || !last || when.getTime() - last.getTime() > gapMinutes * 60_000)
      day.moments.push({ start: when, items: [item] })
    else moment.items.push(item)
    if (!day.people.includes(item.owner)) day.people.push(item.owner)
    day.count++
    last = when
  }
  return days
}

/** Everyone who added something, with how many files, most first. */
export function timelinePeople(items: FileItem[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.owner, (counts.get(item.owner) ?? 0) + 1)
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
