import { describe, expect, it } from 'vitest'

import { cardHeight, nameLines } from '@/lib/qrCard'

const fitsIn = (chars: number) => (text: string) => text.length <= chars

describe('QR card names', () => {
  it('keeps short names on one line', () => {
    expect(nameLines('Summer party', fitsIn(20))).toEqual(['Summer party'])
  })

  it('wraps long names onto two lines and shortens the rest', () => {
    expect(nameLines('Wedding of Anna and Mark', fitsIn(12))).toEqual([
      'Wedding of',
      'Anna and Ma…',
    ])
    expect(nameLines('Grandma’s birthday', fitsIn(10))).toEqual(['Grandma’s', 'birthday'])
  })

  it('shortens a single word that is too long', () => {
    expect(nameLines('Supercalifragilistic', fitsIn(8))).toEqual(['Superca…'])
  })

  it('grows the card with the name', () => {
    expect(cardHeight(2)).toBeGreaterThan(cardHeight(1))
    expect(cardHeight(0)).toBe(cardHeight(1))
  })
})
