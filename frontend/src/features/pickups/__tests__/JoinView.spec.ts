import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import JoinView from '@/features/pickups/views/JoinView.vue'
import { on, requests } from '@/test/fakeApi'
import { folder, pickup, PICKUP_ID } from '@/test/factories'
import { pageText, renderAt } from '@/test/render'

const render = (query = '') =>
  renderAt(JoinView, `/pickup/${PICKUP_ID}/join${query}`, { pickupId: PICKUP_ID })

describe('JoinView', () => {
  it('joins with name, folder name and email, then opens the pickup', async () => {
    on('GET', '/api/pickups/:id/', { body: pickup() })
    on('POST', '/api/pickups/:id/join/', {
      status: 201,
      body: { folder: folder({ can_edit: true }), member_url: '/pickup/x/member/key' },
    })
    const { wrapper, router } = await render()
    expect(pageText()).toContain('Join Summer party')

    await wrapper.find('#user_name').setValue('Bob')
    expect((wrapper.find('#folder_name').element as HTMLInputElement).value).toBe('Bob')
    await wrapper.find('#folder_name').setValue('Bob uploads')
    await wrapper.find('#user_name').setValue('Bobby')
    await wrapper.find('#user_email').setValue('bob@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(requests.find((r) => r.path.endsWith('/join/'))?.body).toEqual({
      user_name: 'Bobby',
      name: 'Bob uploads',
      user_email: 'bob@example.com',
    })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('explorer-folder'))
  })

  it('shows validation errors next to the fields', async () => {
    on('GET', '/api/pickups/:id/', { body: pickup() })
    on('POST', '/api/pickups/:id/join/', {
      status: 400,
      body: {
        user_name: ['This name is already taken.'],
        name: ['Folder exists.'],
        user_email: ['Bad email.'],
      },
    })
    const { wrapper, router } = await render()
    await wrapper.find('#user_name').setValue('Alice')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(pageText()).toContain('This name is already taken.')
    expect(pageText()).toContain('Folder exists.')
    expect(pageText()).toContain('Bad email.')
    expect(router.currentRoute.value.name).toBe('pickup-join')
  })

  it('explains an invalid personal link', async () => {
    on('GET', '/api/pickups/:id/', { body: pickup({ title: '' }) })
    await render('?invalidLink=1')
    expect(pageText()).toContain('That personal link is not valid')
    expect(pageText()).toContain('Join this pickup')
  })

  it('explains unknown pickups', async () => {
    on('GET', '/api/pickups/:id/', { status: 404, body: {} })
    await render()
    expect(pageText()).toContain('Pickup not found')
  })
})
