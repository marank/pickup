import { VueQueryPlugin } from '@tanstack/vue-query'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h, type Component } from 'vue'
import { RouterView } from 'vue-router'

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

/** Mount the router view at `path`, so navigation re-renders like in the app. */
export async function renderRoute(path: string) {
  const Root = defineComponent({ render: () => h(RouterView) })
  return renderAt(Root, path)
}

/** Open a reka-ui dropdown menu (it opens on keyboard or pointerdown, not on click). */
export async function openMenu(label: string) {
  const trigger = findButton(label)
  trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flushPromises()
}

/** Click a menu item of the open menu by its text. */
export async function chooseMenuItem(text: string | RegExp) {
  const items = Array.from(document.body.querySelectorAll<HTMLElement>('[role^="menuitem"]'))
  const item = items.find((el) =>
    typeof text === 'string'
      ? el.textContent?.trim().startsWith(text)
      : text.test(el.textContent ?? ''),
  )
  if (!item)
    throw new Error(
      `No menu item "${text}" in: ${items.map((el) => el.textContent?.trim()).join(' | ')}`,
    )
  item.click()
  await flushPromises()
}
