import { ApiError, apiErrorMessage } from '@/api/errors'
import { t } from '@/lib/i18n'

/**
 * Why an upload failed, in words people can act on. The server's own message wins (storage
 * full, read-only, file type); otherwise the status or the kind of failure decides.
 */
export function uploadErrorMessage(err: unknown, online = navigator.onLine): string {
  if (err instanceof ApiError) {
    const own = apiErrorMessage(err, '')
    if (own) return own
    if (err.status === 413) return t('The file is too large to send in one go.')
    if (err.status === 429) return t('Too many uploads at once. Try again in a minute.')
    if (err.status >= 500) return t('The server had a problem. Try again in a moment.')
    return t('The server refused the file ({status}).', { status: err.status })
  }
  if (!online) return t('You are offline. Try again once you have a connection.')
  // fetch only throws for the network itself (TypeError: "Failed to fetch", "Load failed").
  const detail = err instanceof Error && err.message ? ` (${err.message})` : ''
  return t('The connection broke off. Try again.') + detail
}
