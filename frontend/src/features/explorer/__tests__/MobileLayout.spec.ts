import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/App.vue'
import { requests } from '@/test/fakeApi'
import { ALICE, BEACH, explorerPath, serveExplorer } from '@/test/explorerData'
import { chooseMenuItem, findButton, pageText, renderAt } from '@/test/render'

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.body.querySelector<T>(selector)
const settle = async () => {
  for (let i = 0; i < 6; i++) await flushPromises()
}
const openMore = async () => {
  findButton('More').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flushPromises()
}

/** A phone: the explorer's compact layout (usePhone matches below 640 px). */
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('max-width: 639px'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
})
afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
  vi.restoreAllMocks()
})

describe('explorer on a phone', () => {
  it('has the title in the header, one toolbar and an upload button', async () => {
    serveExplorer({ pickupOverrides: { expires_at: '2026-12-24T22:59:59Z' } })
    await renderAt(App, explorerPath(ALICE))
    await settle()

    expect($('#header-pickup')?.textContent).toContain('Summer party')
    expect(document.body.querySelector('[aria-label="Forward"]')).toBeNull() // no NavBar
    expect(document.body.querySelector('footer')).toBeNull() // no status bar
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    findButton('Upload photos or videos').click()
    expect(click).toHaveBeenCalled()

    // What the status bar shows moved into the menu.
    await openMore()
    expect(pageText()).toContain('Your folder: Alice')
    expect(pageText()).toContain('Deleted after')
    await chooseMenuItem('New folder')
    expect(pageText()).toContain('New folder')
  })

  it('searches, refreshes and changes the view from the menu', async () => {
    serveExplorer()
    await renderAt(App, explorerPath(ALICE))
    await settle()

    findButton('Search').click()
    await flushPromises()
    await new DOMWrapper($<HTMLInputElement>('input[aria-label="Search this folder"]')!).setValue(
      'zzz',
    )
    findButton('Close search').click()
    await flushPromises()
    expect($('input[aria-label="Search this folder"]')).toBeNull()

    const before = requests.length
    await openMore()
    await chooseMenuItem('Refresh')
    await settle()
    expect(requests.length).toBeGreaterThan(before)

    await openMore()
    expect(pageText()).toContain('Download folder')
    expect(pageText()).toContain('Sort by')
    expect(pageText()).toContain('View')
  })

  it('acts on selected items from the menu', async () => {
    serveExplorer()
    await renderAt(App, explorerPath(ALICE))
    await settle()
    $('[data-item="' + BEACH + '"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    await openMore()
    expect(pageText()).toContain('1 selected')
    await chooseMenuItem('Rename')
    expect(pageText()).toContain('Rename folder')
    findButton('Cancel').click()
    await settle()
    await openMore()
    await chooseMenuItem('Delete selected')
    expect(pageText()).toContain('Delete?')
    findButton('Cancel').click()
    await settle()
    const links: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      links.push(this.href)
    })
    await openMore()
    await chooseMenuItem('Download selected')
    expect(links.at(-1)).toContain(`download/?folders=${BEACH}`)
  })

  it('offers guests to join instead of uploading', async () => {
    serveExplorer({ member: false, pickupOverrides: { visibility: 'link' } })
    const { router } = await renderAt(App, explorerPath())
    await settle()
    expect($('[aria-label="Upload photos or videos"]')).toBeNull()
    await openMore()
    expect(pageText()).toContain('Viewing only')
    await chooseMenuItem('Join to upload')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('pickup-join'))
  })
})
