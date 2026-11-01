import { describe, expect, it } from 'vitest'

import { media } from '@/test/factories'

import { fileItem } from '../lib/items'
import { timelineDays, timelinePeople } from '../lib/timeline'

const file = (id: string, owner: string, taken: string | null, uploaded = '2026-06-20T10:00:00') =>
  fileItem(media({ id, owner_name: owner, taken_at: taken, uploaded_at: uploaded })) as Extract<
    ReturnType<typeof fileItem>,
    { kind: 'file' }
  >

describe('timeline', () => {
  it('groups by day and starts a new moment after a pause', () => {
    const days = timelineDays([
      file('a', 'Anna', '2026-06-13T18:00:00'),
      file('b', 'Ben', '2026-06-13T18:40:00'), // 40 min later: same moment
      file('c', 'Anna', '2026-06-13T20:00:00'), // 80 min later: new moment
      file('d', 'Ben', '2026-06-14T09:00:00'),
      file('e', 'Ben', null, '2026-06-14T09:05:00'), // no capture time: the upload
    ])
    expect(days.map((day) => [day.key, day.count, day.people])).toEqual([
      ['2026-06-13', 3, ['Anna', 'Ben']],
      ['2026-06-14', 2, ['Ben']],
    ])
    expect(days[0]!.moments.map((moment) => moment.items.map((item) => item.id))).toEqual([
      ['a', 'b'],
      ['c'],
    ])
    expect(days[1]!.moments).toHaveLength(1)
    expect(timelineDays([])).toEqual([])
  })

  it('counts who added how much, most first', () => {
    const items = [file('a', 'Ben', null), file('b', 'Anna', null), file('c', 'Ben', null)]
    expect(timelinePeople(items)).toEqual([
      { name: 'Ben', count: 2 },
      { name: 'Anna', count: 1 },
    ])
  })
})
