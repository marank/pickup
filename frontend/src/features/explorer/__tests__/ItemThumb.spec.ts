import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ItemThumb from '@/features/explorer/components/ItemThumb.vue'
import { fileItem } from '@/features/explorer/lib/items'
import { media } from '@/test/factories'

describe('ItemThumb', () => {
  it('shows the small preview instead of the full image', () => {
    const item = fileItem(media({ thumbnail: '/api/files/1/thumbnail/' }))
    expect(mount(ItemThumb, { props: { item } }).find('img').attributes('src')).toBe(
      '/api/files/1/thumbnail/',
    )
  })

  it('falls back to the file for images without a preview', () => {
    const item = fileItem(media({ file: '/api/files/1/' }))
    expect(mount(ItemThumb, { props: { item } }).find('img').attributes('src')).toBe(
      '/api/files/1/',
    )
  })

  it('shows the still of a video, or an icon instead of loading the clip', () => {
    const video = { media_type: 'video', is_image: false, is_video: true } as const
    const still = fileItem(media({ ...video, thumbnail: '/api/files/1/thumbnail/' }))
    expect(
      mount(ItemThumb, { props: { item: still } })
        .find('img')
        .attributes('src'),
    ).toBe('/api/files/1/thumbnail/')
    const wrapper = mount(ItemThumb, { props: { item: fileItem(media(video)) } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('video').exists()).toBe(false)
    expect(wrapper.text()).toContain('Video')
  })
})
