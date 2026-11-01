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
    if (err.status === 413) return t('explorer.uploadErrors.theFileIsTooLarge')
    if (err.status === 429) return t('explorer.uploadErrors.tooManyUploadsAtOnce')
    if (err.status >= 500) return t('explorer.uploadErrors.theServerHadAProblem')
    return t('explorer.uploadErrors.theServerRefusedTheFile', { status: err.status })
  }
  if (!online) return t('explorer.uploadErrors.youAreOfflineTryAgain')
  // fetch only throws for the network itself (TypeError: "Failed to fetch", "Load failed").
  const detail = err instanceof Error && err.message ? ` (${err.message})` : ''
  return t('explorer.uploadErrors.theConnectionBrokeOffTry') + detail
}
