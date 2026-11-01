import type { Pickup } from '@/api/types'
import { formatDate, t } from '@/lib/i18n'

const day = (iso: string) => formatDate(iso, { dateStyle: 'medium' })

/**
 * What the header says about a pickup's two optional dates: until when photos can be added
 * (or that it is read-only now) and when it is deleted.
 */
export function pickupDates(
  pickup: Pick<Pickup, 'read_only_at' | 'is_read_only' | 'expires_at'> | undefined,
) {
  return {
    readOnly: pickup?.is_read_only
      ? t('common.readOnly')
      : pickup?.read_only_at
        ? t('explorer.dates.uploadsUntilDate', { date: day(pickup.read_only_at) })
        : '',
    deleted: pickup?.expires_at
      ? t('explorer.dates.deletedAfterDate', { date: day(pickup.expires_at) })
      : '',
  }
}
