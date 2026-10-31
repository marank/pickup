import { describe, expect, it } from 'vitest'

import { clampOffset, clampZoom, dragMode, release, zoomAround } from '../lib/gestures'

describe('viewer gestures', () => {
  it('tells taps, swipes, pulling down and panning apart', () => {
    expect(dragMode(3, 4, false)).toBeNull()
    expect(dragMode(-30, 10, false)).toBe('swipe')
    expect(dragMode(5, 40, false)).toBe('dismiss')
    expect(dragMode(5, -40, false)).toBeNull()
    expect(dragMode(1, 1, true)).toBeNull() // still a tap (double tap zooms out)
    expect(dragMode(20, 1, true)).toBe('pan')
  })

  it('moves on for long drags and flicks, springs back otherwise', () => {
    expect(release('swipe', -100, 0, 500, 400)).toBe('next')
    expect(release('swipe', 100, 0, 500, 400)).toBe('previous')
    expect(release('swipe', -50, 0, 500, 400)).toBe('stay')
    expect(release('swipe', -50, 0, 60, 400)).toBe('next') // flick
    expect(release('dismiss', 0, 120, 500, 400)).toBe('close')
    expect(release('dismiss', 0, 40, 50, 400)).toBe('close')
    expect(release('dismiss', 0, 40, 500, 400)).toBe('stay')
    expect(release('pan', -300, 0, 50, 400)).toBe('stay')
  })

  it('zooms around a point and keeps the picture on screen', () => {
    expect(clampZoom(0.5)).toBe(1)
    expect(clampZoom(9)).toBe(4)
    // zooming 2x at (100, 0) keeps that spot under the finger
    expect(zoomAround({ x: 0, y: 0 }, 1, 2, { x: 100, y: 0 })).toEqual({ x: -100, y: 0 })
    // a pinch whose fingers moved 10 px also pans
    expect(zoomAround({ x: 0, y: 0 }, 1, 1, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({
      x: 10,
      y: 0,
    })
    const content = { x: 400, y: 300 }
    const stage = { x: 400, y: 600 }
    expect(clampOffset({ x: -900, y: 900 }, 2, content, stage)).toEqual({ x: -200, y: 0 })
  })
})
