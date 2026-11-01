import createClient, { type Middleware } from 'openapi-fetch'

import { locale } from '@/lib/i18n'

import { ensureCsrf, getCsrfToken } from './csrf'
import type { paths } from './schema'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Every unsafe request carries Django's CSRF token (the API enforces it for members too).
const csrf: Middleware = {
  async onRequest({ request }) {
    if (SAFE_METHODS.has(request.method)) return request
    await ensureCsrf()
    request.headers.set('X-CSRFToken', getCsrfToken() ?? '')
    return request
  },
}

// Same origin as the SPA: Vite proxies /api in development, nginx in production.
export const api = createClient<paths>({
  baseUrl: window.location.origin,
  credentials: 'same-origin',
})
api.use(csrf)
// The server answers (errors, mails) in the language the app shows, also when chosen there.
api.use({
  onRequest({ request }) {
    request.headers.set('Accept-Language', locale.value)
    return request
  },
})

/**
 * openapi-typescript types binary fields as strings; real files go as FormData.
 * Spread into a request's options: `api.POST(path, { ...formBody<Schema>({ file }) })`.
 */
export function formBody<T>(fields: Record<string, string | Blob | undefined>) {
  return {
    body: {} as T,
    bodySerializer: () => {
      const data = new FormData()
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) data.append(key, value)
      }
      return data
    },
  }
}
