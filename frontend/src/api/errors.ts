import { t } from '@/lib/i18n'

/** A failed API request; `body` is the parsed error response. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(messageFrom(body) ?? t('app.errors.requestFailedStatus', { status }))
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

/** The first validation message per field of a 400 answer ({ field: ['...'] }), else none. */
export function fieldErrorsOf(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== 'object') return {}
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(err.body)) {
    if (Array.isArray(messages)) errors[field] = String(messages[0])
  }
  return errors
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
