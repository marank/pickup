import { t } from '@/lib/i18n'

/** A failed API request; `body` is the parsed error response. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(messageFrom(body) ?? t('Request failed ({status})', { status }))
  }
}

/** The API's `error`, else the first validation message ({ field: ['...'] }). */
function messageFrom(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  if ('error' in body && typeof body.error === 'string') return body.error
  const first = Object.values(body).flat()[0]
  return typeof first === 'string' ? first : undefined
}

/** User-facing message for a failed request, or the fallback. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  return (err instanceof ApiError && messageFrom(err.body)) || fallback
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404
}

interface FetchResult<T> {
  data?: T
  error?: unknown
  response: Response
}

/** The data of an openapi-fetch call, or an ApiError for TanStack Query to handle. */
export async function unwrap<T>(request: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await request
  if (!response.ok) throw new ApiError(response.status, error)
  return data as T
}
