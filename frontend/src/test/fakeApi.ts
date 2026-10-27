/**
 * In-memory stand-in for the backend: a fetch that answers from a route table and
 * records every request. Installed before the API client is created (setup.ts).
 */

export interface RecordedRequest {
  method: string
  path: string
  csrf: string | null
  body: unknown
}

type Reply = { status?: number; body?: unknown }
type Handler = (request: RecordedRequest, params: Record<string, string>) => Reply | Promise<Reply>

interface Route {
  method: string
  pattern: RegExp
  keys: string[]
  handler: Handler
}

const routes: Route[] = []
export const requests: RecordedRequest[] = []

function compile(path: string): { pattern: RegExp; keys: string[] } {
  const keys: string[] = []
  const source = path.replace(/:(\w+)/g, (_, key: string) => {
    keys.push(key)
    return '([^/]+)'
  })
  return { pattern: new RegExp(`^${source}$`), keys }
}

/** Answer `method path` (path params as `:name`) with a fixed reply or a handler. */
export function on(method: string, path: string, reply: Reply | Handler): void {
  const { pattern, keys } = compile(path)
  const handler = typeof reply === 'function' ? reply : () => reply
  // Newest first, so a test can override a default route.
  routes.unshift({ method, pattern, keys, handler })
}

export function reset(): void {
  routes.length = 0
  requests.length = 0
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  on('GET', '/api/csrf', () => {
    document.cookie = 'csrftoken=test-token; path=/'
    return { status: 204 }
  })
}

async function readBody(request: Request): Promise<unknown> {
  const type = request.headers.get('Content-Type') ?? ''
  if (type.includes('application/json')) return request.json()
  const text = await request.text()
  return text || null
}

export async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request =
    input instanceof Request
      ? input
      : new Request(new URL(String(input), window.location.origin), init)
  if (request.signal.aborted) throw new DOMException('Aborted', 'AbortError')
  const url = new URL(request.url)
  const recorded: RecordedRequest = {
    method: request.method,
    path: url.pathname,
    csrf: request.headers.get('X-CSRFToken'),
    body: await readBody(request),
  }
  requests.push(recorded)

  for (const route of routes) {
    const match = route.method === request.method && route.pattern.exec(url.pathname)
    if (!match) continue
    const params = Object.fromEntries(route.keys.map((key, i) => [key, match[i + 1]!]))
    const { status = 200, body } = await route.handler(recorded, params)
    if (request.signal.aborted) throw new DOMException('Aborted', 'AbortError')
    if (body === undefined) return new Response(null, { status })
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  throw new Error(`fakeApi: no route for ${request.method} ${url.pathname}`)
}
