import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import ConnectView from '@/features/home/views/ConnectView.vue'
import { queryClient } from '@/lib/queryClient'
import { on } from '@/test/fakeApi'
import { pageText, renderAt } from '@/test/render'

const server = (mode: 'everyone' | 'code' | 'none', name = '') =>
  on('GET', '/api/pickups/creation/', { body: { mode, name } })
const appLink = () => document.body.querySelector<HTMLAnchorElement>('a[href^="pickup:"]')!.href
const note = () => document.body.querySelector('[data-testid="connect-note"]')?.textContent ?? ''

beforeEach(() => queryClient.removeQueries({ queryKey: ['creation'] }))
afterEach(() => window.history.replaceState(null, '', '/'))

describe('the server link for the apps', () => {
  it('hands the server to the app and shows its name', async () => {
    server('everyone', 'Sailing club')
    window.history.replaceState(null, '', '/connect')
    await renderAt(ConnectView, '/connect')
    expect(pageText()).toContain('Sailing club')
    expect(pageText()).toContain(window.location.host)
    expect(appLink()).toBe(`pickup://server?url=${encodeURIComponent(window.location.origin)}`)
    expect(note()).toBe('')
  })

  it('passes the code from after the # on, and keeps it for copying', async () => {
    server('code')
    window.history.replaceState(null, '', '/connect#code=AB%20CD%2F1')
    await renderAt(ConnectView, '/connect')
    expect(appLink()).toContain('&code=AB%20CD%2F1')
    expect(window.location.hash).toBe('#code=AB%20CD%2F1')
    expect(document.body.querySelector<HTMLInputElement>('input')!.value).toContain('#code=')
    expect(note()).toContain('carries a code')
    // Without a name the host stands in.
    expect(document.body.querySelector('.font-semibold')!.textContent).toBe(window.location.host)
  })

  it('says when a code is needed but not in the link', async () => {
    server('code')
    window.history.replaceState(null, '', '/connect')
    await renderAt(ConnectView, '/connect')
    expect(note()).toContain('needs a code')
  })

  it('says when nobody can create pickups here', async () => {
    server('none')
    window.history.replaceState(null, '', '/connect')
    await renderAt(ConnectView, '/connect')
    expect(note()).toContain('Nobody can create')
  })
})
