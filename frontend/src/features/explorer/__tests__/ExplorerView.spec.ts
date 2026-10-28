import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import { on, requests } from '@/test/fakeApi'
import { ALICE, BEACH, BOB, DRONE, explorerPath, serveExplorer } from '@/test/explorerData'
import { media, PICKUP_ID } from '@/test/factories'
import {
  chooseMenuItem,
  findButton,
  openMenu,
  pageText,
  renderRoute,
  typeCaption,
} from '@/test/render'

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.body.querySelector<T>(selector)
const items = () => Array.from(document.body.querySelectorAll<HTMLElement>('[data-item]'))
const itemNames = () =>
  items().map((el) => el.querySelector('p, span.truncate')?.textContent?.trim())
const item = (name: string) => {
  const el = items().find((candidate) => candidate.textContent?.includes(name))
  if (!el) throw new Error(`No item ${name}: ${itemNames().join(', ')}`)
  return el
}
const pane = () => $('[data-testid="content-pane"]')!
const press = async (key: string, init: KeyboardEventInit = {}) => {
  pane().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
  await flushPromises()
}
/** Mouse click with modifiers, or a tap (pointerType touch). */
const click = async (el: Element, init: MouseEventInit & { touch?: boolean } = {}) => {
  const event = new MouseEvent('click', { bubbles: true, ...init })
  if (init.touch) Object.defineProperty(event, 'pointerType', { value: 'touch' })
  el.dispatchEvent(event)
  await flushPromises()
}
const dblclick = async (el: Element) => {
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  await flushPromises()
}
const settle = async () => {
  for (let i = 0; i < 5; i++) await flushPromises()
}
const confirmDialogButton = (label: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')).find(
    (button) => button.textContent?.trim() === label,
  )!

async function render(folderId?: string, options: Parameters<typeof serveExplorer>[0] = {}) {
  serveExplorer(options)
  const result = await renderRoute(explorerPath(folderId))
  await settle()
  return result
}

beforeEach(() => localStorage.setItem('pickup.view', 'large'))
afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('explorer: browsing', () => {
  it('shows everyone’s folders at the root, with tree, address bar and status', async () => {
    await render()
    expect(itemNames()).toEqual(['Alice', "Bob's photos"])
    expect($('nav[aria-label="Folders"]')!.textContent).toContain('Summer party')
    expect($('[aria-current="location"]')!.textContent).toContain('Summer party')
    expect(pageText()).toContain('2 items')
    expect(pageText()).toContain('Your folder: Alice')
    expect(findButton('Up one level').disabled).toBe(true)
  })

  it('opens folders by double-click, tree and address bar, and goes up and back', async () => {
    const { router } = await render()
    await dblclick(item('Alice'))
    await settle()
    expect(router.currentRoute.value.params.folderId).toBe(ALICE)
    expect(itemNames()).toEqual(['Beach', 'apple.jpg', 'clip.mp4', 'zebra.jpg'])
    expect($('[aria-current="location"]')!.textContent).toContain('Alice')

    // tree
    const beachInTree = Array.from(
      document.body.querySelectorAll('nav[aria-label="Folders"] button'),
    ).find((b) => b.textContent?.trim() === 'Beach') as HTMLButtonElement
    beachInTree.click()
    await settle()
    expect(router.currentRoute.value.params.folderId).toBe(BEACH)
    expect(itemNames()).toEqual(['wave.jpg'])

    // up, back
    findButton('Up one level').click()
    await settle()
    expect(router.currentRoute.value.params.folderId).toBe(ALICE)
    await press('Backspace')
    await settle()
    expect(router.currentRoute.value.name).toBe('explorer')
  })

  it('expands and collapses tree branches', async () => {
    await render()
    expect(pageText()).not.toContain('Drone shots')
    findButton("Expand Bob's photos").click()
    await flushPromises()
    expect(pageText()).toContain('Drone shots')
    findButton("Collapse Bob's photos").click()
    await flushPromises()
    expect(pageText()).not.toContain('Drone shots')
  })

  it('expands tree branches with the arrow keys', async () => {
    await render()
    const bob = Array.from(document.body.querySelectorAll('nav[aria-label="Folders"] button')).find(
      (b) => b.textContent?.trim() === "Bob's photos",
    )!
    bob.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await flushPromises()
    expect(pageText()).toContain('Drone shots')
    bob.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await flushPromises()
    expect(pageText()).not.toContain('Drone shots')
  })

  it('has a search toggle on small screens', async () => {
    await render(ALICE)
    findButton('Search').click()
    await flushPromises()
    const inputs = document.body.querySelectorAll<HTMLInputElement>(
      'input[placeholder="Search this folder"]',
    )
    expect(inputs).toHaveLength(2)
    await new DOMWrapper(inputs[1]!).setValue('zebra')
    expect(itemNames()).toEqual(['zebra.jpg'])
    findButton('Close search').click()
    await flushPromises()
    expect(document.body.querySelectorAll('input[placeholder="Search this folder"]')).toHaveLength(
      1,
    )
  })

  it('takes typed paths in the address bar and lists subfolders between segments', async () => {
    const { router } = await render(ALICE)
    findButton('Type a path').click()
    await flushPromises()
    const input = new DOMWrapper($<HTMLInputElement>('input[aria-label="Folder path"]')!)
    expect((input.element as HTMLInputElement).value).toBe('Summer party / Alice')

    await input.setValue("Summer party / bob's photos / drone SHOTS")
    await input.trigger('submit')
    await settle()
    expect(router.currentRoute.value.params.folderId).toBe(DRONE)

    const error = vi.spyOn(toast, 'error')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true }))
    await flushPromises()
    const again = new DOMWrapper($<HTMLInputElement>('input[aria-label="Folder path"]')!)
    await again.setValue('Nowhere/else')
    await again.trigger('submit')
    expect(error).toHaveBeenCalledWith("“Nowhere/else” doesn't exist")
    await again.trigger('keydown', { key: 'Escape' })
    expect($('input[aria-label="Folder path"]')).toBeNull()

    await openMenu('Folders in Summer party')
    await chooseMenuItem('Alice')
    await settle()
    expect(router.currentRoute.value.params.folderId).toBe(ALICE)
  })

  it('switches between the four views and sorts the details by column', async () => {
    await render(ALICE)
    for (const [label, check] of [
      ['Details', () => $('table') !== null],
      ['Content', () => pageText().includes('Video (MP4)')],
      ['Small icons', () => $('ul[role="listbox"]') !== null],
      ['Large icons', () => pageText().includes('Stripes')],
    ] as const) {
      await openMenu('View')
      await chooseMenuItem(label)
      expect(check()).toBe(true)
    }
    await openMenu('View')
    await chooseMenuItem('Details')
    const sizeHeader = Array.from(document.body.querySelectorAll('th button')).find((b) =>
      b.textContent?.includes('Size'),
    )!
    ;(sizeHeader as HTMLButtonElement).click()
    await flushPromises()
    expect(itemNames()).toEqual(['Beach', 'apple.jpg', 'clip.mp4', 'zebra.jpg'])
    ;(sizeHeader as HTMLButtonElement).click()
    await flushPromises()
    expect(itemNames()).toEqual(['Beach', 'zebra.jpg', 'clip.mp4', 'apple.jpg'])
    expect(sizeHeader.getAttribute('aria-sort')).toBe('descending')

    await openMenu('Sort')
    await chooseMenuItem('Date added')
    await openMenu('Sort')
    await chooseMenuItem('Ascending')
    expect(itemNames()).toEqual(['Beach', 'zebra.jpg', 'clip.mp4', 'apple.jpg'])
  })

  it('searches the current folder', async () => {
    await render(ALICE)
    const search = new DOMWrapper($<HTMLInputElement>('input[placeholder="Search this folder"]')!)
    await search.setValue('stripes')
    expect(itemNames()).toEqual(['zebra.jpg'])
    await search.setValue('nothing like this')
    expect(pageText()).toContain('Nothing here matches “nothing like this”')
  })

  it('selects like a file manager and shows the selection in status bar and details pane', async () => {
    await render(ALICE)
    await click(item('apple.jpg'))
    expect(item('apple.jpg').getAttribute('aria-selected')).toBe('true')
    expect($('aside[aria-label="Details"]')!.textContent).toContain('No caption')
    await click(item('zebra.jpg'), { ctrlKey: true })
    expect(pageText()).toContain('2 selected')
    expect($('aside[aria-label="Details"]')!.textContent).toContain('2 items selected')
    await click(item('Beach'), { shiftKey: true })
    expect(pageText()).toContain('selected')
    await press('a', { ctrlKey: true })
    expect(pageText()).toContain('4 selected')
    await press('Escape')
    expect(pageText()).not.toContain('selected ·')
    await click(pane())
    expect(items().some((el) => el.getAttribute('aria-selected') === 'true')).toBe(false)
  })

  it('opens files in the viewer and pages through them', async () => {
    await render(ALICE)
    await click(item('apple.jpg'))
    await press('Enter')
    const dialog = () => $('[role="dialog"]')!
    expect(dialog().textContent).toContain('apple.jpg')
    expect(dialog().textContent).toContain('1 / 3')

    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await flushPromises()
    expect(dialog().textContent).toContain('clip.mp4')
    expect(dialog().querySelector('video')).not.toBeNull()
    findButton('Next').click()
    await flushPromises()
    expect(dialog().textContent).toContain('Stripes')
    findButton('Previous').click()
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await flushPromises()
    expect(dialog().textContent).toContain('apple.jpg')

    // swipe
    const stage = $('[data-testid="viewer-stage"]')!
    const pointer = (type: string, x: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x })
      Object.defineProperty(event, 'pointerType', { value: 'touch' })
      stage.dispatchEvent(event)
    }
    pointer('pointerdown', 200)
    pointer('pointerup', 80)
    await flushPromises()
    expect(dialog().textContent).toContain('clip.mp4')
    pointer('pointerup', 80) // no matching pointerdown: ignored
    await flushPromises()
    expect(dialog().textContent).toContain('clip.mp4')

    findButton('Close').click()
    await settle()
    expect(document.body.querySelector('[data-testid="viewer-stage"]')).toBeNull()
  })

  it('opens on tap on touch screens', async () => {
    const { router } = await render()
    await click(item('Alice'), { touch: true })
    await settle()
    expect(router.currentRoute.value.params.folderId).toBe(ALICE)
    await click(item('apple.jpg'), { touch: true })
    expect($('[data-testid="viewer-stage"]')).not.toBeNull()
  })

  it('shows the folder tree in a panel on small screens', async () => {
    const { router } = await render()
    findButton('Show folders').click()
    await settle()
    const sheet = $('[role="dialog"]')!
    expect(sheet.textContent).toContain('Folders')
    const alice = Array.from(sheet.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Alice',
    )!
    alice.click()
    await settle()
    expect(router.currentRoute.value.params.folderId).toBe(ALICE)
    expect($('[role="dialog"]')).toBeNull()
  })

  it('hides and shows the folder tree on wide screens', async () => {
    window.matchMedia = vi.fn<(q: string) => MediaQueryList>(
      (query) =>
        ({
          matches: query.includes('min-width'),
          addEventListener() {},
          removeEventListener() {},
        }) as unknown as MediaQueryList,
    )
    await render()
    expect($('nav[aria-label="Folders"]')).not.toBeNull()
    findButton('Hide folders').click()
    await flushPromises()
    expect($('nav[aria-label="Folders"]')).toBeNull()
    expect(localStorage.getItem('pickup.tree')).toBe('off')
    findButton('Show folders').click()
    await flushPromises()
    expect($('nav[aria-label="Folders"]')).not.toBeNull()
    expect($('[role="dialog"]')).toBeNull() // no slide-in panel on wide screens
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('selects by dragging a rectangle over empty space, with auto-scroll at the edge', async () => {
    await render(ALICE)
    // jsdom has no layout: place the pane and four tiles (100x100, in a row) by hand.
    const rect = (left: number, top: number, width: number, height: number) =>
      ({
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON() {},
      }) as DOMRect
    vi.spyOn(pane(), 'getBoundingClientRect').mockReturnValue(rect(0, 0, 800, 400))
    items().forEach((el, index) =>
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(10 + index * 110, 10, 100, 100)),
    )
    const pointer = (type: string, x: number, y: number, init: MouseEventInit = {}) => {
      const target = type === 'pointerdown' ? pane() : pane()
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX: x,
        clientY: y,
        button: 0,
        ...init,
      })
      Object.defineProperty(event, 'pointerType', { value: 'mouse' })
      target.dispatchEvent(event)
    }
    const selectedNames = () =>
      items()
        .filter((el) => el.getAttribute('aria-selected') === 'true')
        .map((el) => el.dataset.item)

    pointer('pointerdown', 300, 300)
    pointer('pointermove', 302, 301) // below the threshold: no box yet
    await flushPromises()
    expect($('[data-testid="marquee"]')).toBeNull()
    pointer('pointermove', 130, 50)
    await flushPromises()
    expect($('[data-testid="marquee"]')).not.toBeNull()
    // Tiles sit at x = 10, 120, 230, 340: the box from x = 130 to 300 touches apple and clip.
    expect(selectedNames()).toEqual(['m-apple', 'm-clip'])

    pointer('pointerup', 130, 50)
    await click(pane()) // the click after a drag must not clear the selection
    await flushPromises()
    expect($('[data-testid="marquee"]')).toBeNull()
    expect(selectedNames()).toHaveLength(2)

    // Ctrl adds to the existing selection (the box now also touches the Beach tile).
    vi.useFakeTimers() // the auto-scroll timer starts with the press
    pointer('pointerdown', 5, 200, { ctrlKey: true })
    pointer('pointermove', 60, 60)
    await flushPromises()
    expect(selectedNames()).toHaveLength(3)
    // At the bottom edge the pane scrolls, also while the mouse stands still.
    pointer('pointermove', 60, 395)
    vi.advanceTimersByTime(100)
    vi.useRealTimers()
    expect(pane().scrollTop).toBeGreaterThan(0)
    pointer('pointerup', 60, 395)
    await click(pane())

    // Pressing on an item or with another button doesn't start a rectangle.
    item('apple.jpg').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }))
    pointer('pointerdown', 300, 300, { button: 2 })
    pointer('pointermove', 10, 10)
    await flushPromises()
    expect($('[data-testid="marquee"]')).toBeNull()
  })

  it('can go back and forward through the history', async () => {
    const { router } = await render()
    await dblclick(item('Alice'))
    await settle()
    // The test router's memory history keeps no "back" entry, so the buttons stay disabled
    // here; they only need to drive the router (the browser history sets the state).
    findButton('Back').disabled = false
    findButton('Forward').disabled = false
    const back = vi.spyOn(router, 'back')
    const forward = vi.spyOn(router, 'forward')
    findButton('Back').click()
    findButton('Forward').click()
    expect(back).toHaveBeenCalled()
    expect(forward).toHaveBeenCalled()
  })
})

describe('explorer: owner actions', () => {
  it('creates a subfolder in the current folder', async () => {
    on('POST', '/api/pickups/:p/folders/:f/subfolders/', {
      status: 201,
      body: { ...media(), id: 'new-folder' },
    })
    await render(ALICE)
    findButton('New folder').click()
    await flushPromises()
    await new DOMWrapper($<HTMLInputElement>('#name-dialog-input')!).setValue('  Sunsets ')
    findButton('Create').click()
    await settle()
    expect(requests.find((r) => r.path.endsWith('/subfolders/'))).toMatchObject({
      path: `/api/pickups/${PICKUP_ID}/folders/${ALICE}/subfolders/`,
      body: { name: 'Sunsets' },
    })
  })

  it('renames a folder with F2 and edits a caption from the details pane', async () => {
    on('PATCH', '/api/pickups/:p/folders/:f/', { body: {} })
    on('PATCH', '/api/pickups/:p/folders/:f/media/:m/caption/', { body: media() })
    await render(ALICE)
    await click(item('Beach'))
    await press('F2')
    const name = new DOMWrapper($<HTMLInputElement>('#name-dialog-input')!)
    expect((name.element as HTMLInputElement).value).toBe('Beach')
    await name.setValue('Seaside')
    await name.trigger('submit')
    await settle()
    expect(requests.find((r) => r.method === 'PATCH')).toMatchObject({
      path: `/api/pickups/${PICKUP_ID}/folders/${BEACH}/`,
      body: { name: 'Seaside' },
    })

    await click(item('zebra.jpg'))
    findButton('Edit caption').click()
    await flushPromises()
    await typeCaption('Black and white')
    findButton('Save').click()
    await settle()
    expect(requests.find((r) => r.path.endsWith('/caption/'))).toMatchObject({
      path: `/api/pickups/${PICKUP_ID}/folders/${ALICE}/media/m-zebra/caption/`,
      body: { caption: 'Black and white' },
    })
  })

  it('deletes the selection after confirmation, but never the own top-level folder', async () => {
    on('DELETE', '/api/pickups/:p/folders/:f/media/:m/', { status: 204 })
    on('DELETE', '/api/pickups/:p/folders/:f/', { status: 204 })
    const success = vi.spyOn(toast, 'success')
    await render(ALICE)
    await click(item('Beach'))
    await click(item('apple.jpg'), { ctrlKey: true })
    await press('Delete')
    expect($('[role="alertdialog"]')!.textContent).toContain(
      '2 items will be removed for everyone, including everything inside',
    )
    confirmDialogButton('Delete').click()
    await settle()
    expect(requests.filter((r) => r.method === 'DELETE').map((r) => r.path)).toEqual([
      `/api/pickups/${PICKUP_ID}/folders/${BEACH}/`,
      `/api/pickups/${PICKUP_ID}/folders/${ALICE}/media/m-apple/`,
    ])
    expect(success).toHaveBeenCalledWith('“apple.jpg” deleted')

    findButton('Up one level').click()
    await settle()
    await click(item('Alice'))
    await press('Delete')
    expect($('[role="alertdialog"]')).toBeNull()
  })

  it('renames and captions from the item menu', async () => {
    await render(ALICE)
    await openMenu('Actions for Beach')
    await chooseMenuItem('Rename')
    expect(($('#name-dialog-input') as HTMLInputElement).value).toBe('Beach')
    findButton('Cancel').click()
    await settle()
    await openMenu('Actions for zebra.jpg')
    await chooseMenuItem('Edit caption')
    expect(($('[role="dialog"] textarea') as HTMLTextAreaElement).value).toBe('Stripes')
  })

  it('retries and cancels uploads in the upload panel', async () => {
    let fail = true
    let release: (() => void) | null = null
    on('POST', '/api/pickups/:p/folders/:f/media/', () => {
      if (fail) return { status: 400, body: { file: ['Broken file'] } }
      return new Promise((resolve) => {
        release = () => resolve({ status: 201, body: media() })
      })
    })
    await render(ALICE)
    const input = $<HTMLInputElement>('[data-testid="file-input"]')!
    Object.defineProperty(input, 'files', {
      value: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })],
      configurable: true,
    })
    input.dispatchEvent(new Event('change'))
    await settle()
    expect($('[aria-label="Uploads"]')!.textContent).toContain('Broken file')

    fail = false
    findButton('Retry').click()
    await settle()
    expect($('[aria-label="Uploads"]')!.textContent).toContain('Uploading 1 of 1')
    findButton('Cancel').click()
    ;(release as (() => void) | null)?.()
    await settle()
    expect($('[aria-label="Uploads"]')!.textContent).toContain('Cancelled')
    findButton('Clear finished').click()
    await settle()
    expect($('[aria-label="Uploads"]')).toBeNull()
  })

  it('reports failed actions', async () => {
    on('DELETE', '/api/pickups/:p/folders/:f/media/:m/', {
      status: 403,
      body: { error: 'Not yours' },
    })
    const error = vi.spyOn(toast, 'error')
    await render(ALICE)
    await click(item('apple.jpg'))
    findButton('Delete').click()
    await flushPromises()
    confirmDialogButton('Delete').click()
    await settle()
    expect(error).toHaveBeenCalledWith('Not yours')
  })

  it('offers the same actions in the item menu and the context menu', async () => {
    const hrefs: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      hrefs.push(this.getAttribute('href')!)
    })
    await render(ALICE)
    await openMenu('Actions for clip.mp4')
    await chooseMenuItem('Download')
    expect(hrefs).toEqual(['/media/2026/10/27/abc.jpg'])

    item('zebra.jpg').dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }),
    )
    await flushPromises()
    expect(item('zebra.jpg').getAttribute('aria-selected')).toBe('true')
    await chooseMenuItem('View')
    expect($('[role="dialog"]')!.textContent).toContain('zebra.jpg')
    findButton('Close').click()
    await settle()

    await click(item('apple.jpg'))
    await click(item('zebra.jpg'), { ctrlKey: true })
    await openMenu('Actions for zebra.jpg')
    expect(pageText()).toContain('Download 2 items as ZIP')
    expect(pageText()).toContain('Delete 2 items')
    await chooseMenuItem('Download 2 items as ZIP')
    expect(hrefs.at(-1)).toBe(
      `/api/pickups/${PICKUP_ID}/download/?folders=&media=m-apple%2Cm-zebra`,
    )

    await click(item('Beach'))
    await click(item('apple.jpg'), { ctrlKey: true })
    findButton('Download').click()
    expect(hrefs.at(-1)).toBe(`/api/pickups/${PICKUP_ID}/download/?folders=${BEACH}&media=m-apple`)
  })

  it('downloads the current folder or the whole pickup as ZIP', async () => {
    const hrefs: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      hrefs.push(this.getAttribute('href')!)
    })
    await render(ALICE)
    findButton('Download folder').click()
    findButton('Up one level').click()
    await settle()
    findButton('Download all').click()
    expect(hrefs).toEqual([
      `/api/pickups/${PICKUP_ID}/download/?folders=${ALICE}`,
      `/api/pickups/${PICKUP_ID}/download/`,
    ])
    await click(item('Alice'))
    expect(document.body.querySelector('button[aria-label="Download all"]')).toBeNull()
  })

  it('refuses files that would not fit and shows the own usage', async () => {
    on('POST', '/api/pickups/:p/folders/:f/media/', { status: 201, body: media() })
    await render(ALICE, {
      pickupOverrides: {
        storage: { used: 9_000, limit: 100_000, own_used: 9_000, own_limit: 10_240 },
      },
    })
    expect(pageText()).toContain('Your folder: Alice · 8.8 KB of 10 KB')
    const input = $<HTMLInputElement>('[data-testid="file-input"]')!
    Object.defineProperty(input, 'files', {
      value: [
        new File(['x'.repeat(1_000)], 'small.jpg', { type: 'image/jpeg' }),
        new File(['x'.repeat(1_000)], 'second.jpg', { type: 'image/jpeg' }),
      ],
      configurable: true,
    })
    const error = vi.spyOn(toast, 'error')
    input.dispatchEvent(new Event('change'))
    await settle()
    expect(error).toHaveBeenCalledWith("second.jpg doesn't fit: 240 B of storage left")
    expect(requests.filter((r) => r.method === 'POST')).toHaveLength(1)
  })

  it('uploads into the current folder, and from the root into the own folder', async () => {
    on('POST', '/api/pickups/:p/folders/:f/media/', { status: 201, body: media() })
    const { router } = await render()
    const input = $<HTMLInputElement>('[data-testid="file-input"]')!
    const pick = async (files: File[]) => {
      Object.defineProperty(input, 'files', { value: files, configurable: true })
      input.dispatchEvent(new Event('change'))
      await settle()
    }
    const error = vi.spyOn(toast, 'error')
    await pick([
      new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
    ])
    expect(error).toHaveBeenCalledWith('notes.txt is not a photo or video')
    expect(requests.filter((r) => r.method === 'POST').map((r) => r.path)).toEqual([
      `/api/pickups/${PICKUP_ID}/folders/${ALICE}/media/`,
    ])
    expect(router.currentRoute.value.params.folderId).toBe(ALICE)
    expect($('[aria-label="Uploads"]')!.textContent).toContain('1 of 1 uploaded')

    findButton(/1 of 1 uploaded/).click()
    await flushPromises()
    expect($('[aria-label="Uploads"]')!.textContent).not.toContain('Clear finished')
  })

  it('accepts dropped files with a visible drop zone', async () => {
    on('POST', '/api/pickups/:p/folders/:f/media/', { status: 201, body: media() })
    await render(BEACH)
    const target = new DOMWrapper(pane())
    await target.trigger('dragenter', { dataTransfer: { types: ['Files'] } })
    expect(pageText()).toContain('Drop to upload into “Beach”')
    await target.trigger('dragleave', { dataTransfer: { types: ['Files'] } })
    expect(pageText()).not.toContain('Drop to upload')
    await target.trigger('dragenter', { dataTransfer: { types: ['text/plain'] } })
    expect(pageText()).not.toContain('Drop to upload')
    await target.trigger('drop', {
      dataTransfer: { files: [new File(['x'], 'b.jpg', { type: 'image/jpeg' })] },
    })
    await settle()
    expect(
      requests.some((r) => r.path === `/api/pickups/${PICKUP_ID}/folders/${BEACH}/media/`),
    ).toBe(true)
  })

  it('lets the creator rename the pickup', async () => {
    on('PATCH', '/api/pickups/:id/', { body: {} })
    await render(undefined, { creator: true })
    findButton('Rename pickup').click()
    await flushPromises()
    await new DOMWrapper($<HTMLInputElement>('#name-dialog-input')!).setValue('Sommerfest')
    findButton('Save').click()
    await settle()
    expect(requests.find((r) => r.method === 'PATCH')).toMatchObject({
      path: `/api/pickups/${PICKUP_ID}/`,
      body: { title: 'Sommerfest' },
    })
  })

  it('shares the link, with the system share sheet where available', async () => {
    const share = vi
      .fn<(data: ShareData) => Promise<void>>()
      .mockRejectedValue(new Error('dismissed'))
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    await render()
    findButton('Share').click()
    await flushPromises()
    expect(($('[role="dialog"] input') as HTMLInputElement).value).toBe(
      `${window.location.origin}/pickup/${PICKUP_ID}`,
    )
    findButton('Share via …').click()
    await flushPromises()
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Summer party' }))
    Reflect.deleteProperty(navigator, 'share')
  })
})

describe('explorer: QR code', () => {
  /** A 2D context that records what is drawn; text is 20 px per character. */
  function fakeContext() {
    const texts: string[] = []
    const context = new Proxy(
      {},
      {
        get: (_target, key) =>
          key === 'fillText'
            ? (text: string) => texts.push(text)
            : key === 'measureText'
              ? (text: string) => ({ width: text.length * 20 })
              : () => {},
        set: () => true,
      },
    ) as CanvasRenderingContext2D
    return { context, texts }
  }

  it('shows the QR card and saves it as PNG', async () => {
    const { context, texts } = fakeContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) =>
      done(new Blob(['png'])),
    )
    Object.assign(URL, { createObjectURL: () => 'blob:qr', revokeObjectURL: () => {} })
    const hadPath2D = 'Path2D' in globalThis
    if (!hadPath2D) Object.assign(globalThis, { Path2D: class {} })
    const saved: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved.push(this.download)
    })
    await render()
    findButton('Share').click()
    await settle()
    expect($('canvas[aria-label="QR code card for “Summer party”"]')).not.toBeNull()
    expect(texts).toEqual(expect.arrayContaining(['Summer party']))

    findButton('Save QR card').click()
    await settle()
    expect(saved).toEqual(['Summer party – QR code.png'])
    if (!hadPath2D) Reflect.deleteProperty(globalThis, 'Path2D')
  })

  it('reports when the browser cannot draw the image', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const error = vi.spyOn(toast, 'error')
    await render()
    findButton('Share').click()
    await flushPromises()
    findButton('Save QR card').click()
    await settle()
    expect(error).toHaveBeenCalledWith('Could not create the image')
  })
})

describe('explorer: visitors and edge cases', () => {
  it('lets visitors look but not change anything', async () => {
    await render(ALICE, { member: false })
    expect(pageText()).toContain('Viewing only')
    expect(pageText()).not.toContain('New folder')
    expect(document.body.querySelector('button[aria-label="Upload"]')).toBeNull()
    await click(item('apple.jpg'))
    await press('Delete')
    await press('F2')
    expect($('[role="alertdialog"], [role="dialog"]')).toBeNull()
    expect($('aside[aria-label="Details"] button[aria-label="Edit caption"]')).toBeNull()
  })

  it('offers visitors to join, and explains empty folders', async () => {
    const { router } = await render(BOB, { member: false })
    expect(pageText()).toContain('Join to upload')
    await dblclick(item('Drone shots'))
    await settle()
    expect(router.currentRoute.value.params.folderId).toBe(DRONE)
    expect(pageText()).toContain("Bob hasn't added anything here yet.")
  })

  it('shows the pickup overview in the details pane at the root', async () => {
    await render()
    expect($('aside[aria-label="Details"]')!.textContent).toContain('People2')
    findButton('Details pane').click()
    await flushPromises()
    expect($('aside[aria-label="Details"]')).toBeNull()
  })

  it('explains deleted folders and unknown pickups', async () => {
    const { router } = await render('deleted-folder-id')
    expect(pageText()).toContain("This folder doesn't exist anymore.")
    findButton('Back to the pickup').click()
    await settle()
    expect(router.currentRoute.value.name).toBe('explorer')

    on('GET', '/api/pickups/:id/', { status: 404, body: {} })
    on('GET', '/api/pickups/:id/folders/', { status: 404, body: {} })
    await renderRoute('/pickup/missing')
    await settle()
    expect(pageText()).toContain('Pickup not found')
  })

  it('lets the creator delete what others added, but not their top-level folders', async () => {
    on('DELETE', '/api/pickups/:p/folders/:f/', { status: 204 })
    await render(BOB, { member: false, creator: true })
    expect(pageText()).toContain('Create your folder')
    await click(item('Drone shots'))
    await press('Delete')
    confirmDialogButton('Delete').click()
    await settle()
    expect(
      requests.some((r) => r.method === 'DELETE' && r.path.endsWith(`/folders/${DRONE}/`)),
    ).toBe(true)

    findButton('Up one level').click()
    await settle()
    await click(item("Bob's photos"))
    await press('Delete')
    expect($('[role="alertdialog"]')).toBeNull()
  })

  it('shows only how to join a private pickup, without loading its contents', async () => {
    await render(undefined, {
      member: false,
      pickupOverrides: { can_view: false, join_policy: 'invite', folder_count: 0, media_count: 0 },
    })
    expect(pageText()).toContain('Private pickup')
    expect(pageText()).toContain('Only invited people can take part')
    expect(items()).toEqual([])
    expect(requests.some((r) => r.path.endsWith('/folders/'))).toBe(false)
  })

  it('redirects old folder links', async () => {
    const { router } = await render()
    await router.push(`/pickup/${PICKUP_ID}/folder/${ALICE}`)
    await settle()
    expect(router.currentRoute.value.name).toBe('explorer-folder')
  })
})
