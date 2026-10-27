import { VueQueryPlugin } from '@tanstack/vue-query'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Component } from 'vue'

import { queryClient } from '@/lib/queryClient'
import { homeRoutes } from '@/router/routes/home'
import { pickupRoutes } from '@/router/routes/pickups'

/** Mount a view or component with the app's routes and query client, at `path`. */
export async function renderAt(
  component: Component,
  path: string,
  props: Record<string, unknown> = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [...homeRoutes, ...pickupRoutes],
  })
  await router.push(path)
  const wrapper = mount(component, {
    props,
    attachTo: document.body,
    global: { plugins: [router, [VueQueryPlugin, { queryClient }]] },
  })
  await flushPromises()
  return { wrapper, router }
}

/** Text of the whole document, including dialogs teleported to <body>. */
export const pageText = () => document.body.textContent ?? ''

export function findButton(name: string | RegExp): HTMLButtonElement {
  const buttons = Array.from(document.body.querySelectorAll('button'))
  const match = buttons.find((button) => {
    const label = button.getAttribute('aria-label') ?? button.textContent?.trim() ?? ''
    return typeof name === 'string' ? label === name : name.test(label)
  })
  if (!match)
    throw new Error(
      `No button "${name}" in: ${buttons.map((b) => b.textContent?.trim()).join(' | ')}`,
    )
  return match
}

/** Type into the caption field of the open dialog. */
export async function typeCaption(text: string) {
  const textarea = document.body.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea')
  if (!textarea) throw new Error('No caption field in an open dialog')
  await new DOMWrapper(textarea).setValue(text)
}
