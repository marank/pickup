import { describe, expect, it } from 'vitest'

import { initVisibleViewport } from '../visibleViewport'

class FakeViewport extends EventTarget {
  height = 800
  offsetTop = 0
}

describe('initVisibleViewport', () => {
  it('follows the visible area, e.g. when the keyboard opens', () => {
    const root = document.createElement('html')
    const viewport = new FakeViewport()
    initVisibleViewport(root, viewport)
    expect(root.classList.contains('vv')).toBe(true)
    expect(root.style.getPropertyValue('--vv-height')).toBe('800px')

    Object.assign(viewport, { height: 450, offsetTop: 120 }) // keyboard up, page panned
    viewport.dispatchEvent(new Event('resize'))
    expect(root.style.getPropertyValue('--vv-height')).toBe('450px')
    expect(root.style.getPropertyValue('--vv-top')).toBe('120px')
    viewport.offsetTop = 60
    viewport.dispatchEvent(new Event('scroll'))
    expect(root.style.getPropertyValue('--vv-top')).toBe('60px')
  })

  it('leaves everything alone without visualViewport', () => {
    const root = document.createElement('html')
    initVisibleViewport(root, null)
    expect(root.classList.contains('vv')).toBe(false)
    expect(root.getAttribute('style')).toBeNull()
  })
})
