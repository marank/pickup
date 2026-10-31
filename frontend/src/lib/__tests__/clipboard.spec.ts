import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyText } from '../clipboard'

class FakeClipboardItem {
  constructor(readonly items: Record<string, Promise<Blob>>) {}
}

function clipboard(api: Partial<Clipboard>) {
  Object.defineProperty(navigator, 'clipboard', { value: api, configurable: true })
}

describe('copyText', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('writes the text once it has loaded where only writeText exists', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()
    clipboard({ writeText })
    await copyText(Promise.resolve('https://example.com/a'))
    expect(writeText).toHaveBeenCalledWith('https://example.com/a')
  })

  it('hands the clipboard a promise during the click where it can take one', async () => {
    vi.stubGlobal('ClipboardItem', FakeClipboardItem)
    const write = vi.fn<(items: FakeClipboardItem[]) => Promise<void>>(async ([item]) => {
      expect(await item!.items['text/plain']!.then((blob) => blob.text())).toBe('link')
    })
    clipboard({ write } as unknown as Partial<Clipboard>)
    await copyText(Promise.resolve('link'))
    expect(write).toHaveBeenCalledOnce()
  })

  it('reports why the text could not be loaded rather than the clipboard error', async () => {
    vi.stubGlobal('ClipboardItem', FakeClipboardItem)
    const write = vi.fn<(items: FakeClipboardItem[]) => Promise<void>>(async ([item]) => {
      await item!.items['text/plain']
    })
    clipboard({ write } as unknown as Partial<Clipboard>)
    await expect(copyText(Promise.reject(new Error('offline')))).rejects.toThrow('offline')
  })

  it('passes on clipboard errors', async () => {
    vi.stubGlobal('ClipboardItem', FakeClipboardItem)
    clipboard({ write: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('denied')) })
    await expect(copyText(Promise.resolve('link'))).rejects.toThrow('denied')
  })
})
