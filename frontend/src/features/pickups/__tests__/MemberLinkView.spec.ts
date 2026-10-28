import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '@/App.vue'
import { queryClient } from '@/lib/queryClient'
import { on, requests } from '@/test/fakeApi'
import { explorerPath, serveExplorer } from '@/test/explorerData'
import { pickup, PICKUP_ID } from '@/test/factories'
import { findButton, pageText, renderAt } from '@/test/render'

const link = `/pickup/${PICKUP_ID}/member/secret-key`
const settle = async () => {
  for (let i = 0; i < 5; i++) await flushPromises()
}
const sessions = () => requests.filter((r) => r.method === 'POST' && r.path.endsWith('/session/'))

afterEach(() => vi.useRealTimers())

async function openLink(preview: object | null) {
  on(
    'POST',
    '/api/pickups/:id/session/preview/',
    preview
      ? { body: preview }
      : { status: 403, body: { error: 'This personal link is not valid.' } },
  )
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  const result = await renderAt(App, link)
  await vi.advanceTimersByTimeAsync(2000)
  vi.useRealTimers()
  await settle()
  return result
}

describe('personal link page', () => {
  it('says whose link it is and logs in only on the button', async () => {
    const { router } = await openLink({ title: 'Wedding', user_name: 'Anna', is_creator: true })
    expect(requests.find((r) => r.path.endsWith('/session/preview/'))?.body).toEqual({
      access_key: 'secret-key',
    })
    expect(document.body.querySelector('header')).toBeNull()
    expect(pageText()).toContain('Wedding')
    expect(pageText()).toContain('You are Anna, the creator.')
    expect(sessions()).toHaveLength(0) // not logged in yet

    serveExplorer({ creator: true })
    on('POST', '/api/pickups/:id/session/', { body: pickup({ is_creator: true }) })
    findButton(/Log in/).click()
    await settle()
    expect(sessions().at(-1)?.body).toEqual({ access_key: 'secret-key' })
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe(explorerPath()))
    expect(queryClient.getQueryData(['pickup', PICKUP_ID, 'detail'])).toMatchObject({
      is_creator: true,
    })
  })

  it('calls a creator without a name "the creator"', async () => {
    await openLink({ title: '', user_name: 'Creator', is_creator: true })
    expect(pageText()).toContain('Untitled pickup')
    expect(pageText()).toContain('You are the creator.')
  })

  it('sends invalid links to the join page', async () => {
    const { router } = await openLink(null)
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('pickup-join'))
    expect(router.currentRoute.value.query.invalidLink).toBe('1')
    expect(sessions()).toHaveLength(0)
  })

  it('reports a failed login', async () => {
    await openLink({ title: 'Wedding', user_name: 'Bob', is_creator: false })
    on('POST', '/api/pickups/:id/session/', { status: 403, body: { error: 'Gone.' } })
    const { toast } = await import('vue-sonner')
    const error = vi.spyOn(toast, 'error')
    findButton(/Log in/).click()
    await settle()
    expect(error).toHaveBeenCalledWith('Gone.')
  })
})
