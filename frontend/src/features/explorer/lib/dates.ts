import type { Pickup } from '@/api/types'

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })

/**
 * What the header says about a pickup's two optional dates: until when photos can be added
 * (or that it is read-only now) and when it is deleted.
 */
export function pickupDates(
  pickup: Pick<Pickup, 'read_only_at' | 'is_read_only' | 'expires_at'> | undefined,
) {
  return {
    readOnly: pickup?.is_read_only
      ? 'Read-only'
      : pickup?.read_only_at
        ? `Uploads until ${day(pickup.read_only_at)}`
        : '',
    deleted: pickup?.expires_at ? `Deleted after ${day(pickup.expires_at)}` : '',
  }
}
