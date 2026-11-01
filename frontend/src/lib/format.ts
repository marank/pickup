import { formatDate, plural, t } from './i18n'

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${units[i]}`
}

/** "Today", "Yesterday", "3 days ago" within a week, else the local date. */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000)
  if (days <= 0) return t('app.format.today')
  if (days === 1) return t('app.format.yesterday')
  if (days < 7) return plural(days, 'app.format.nDaysAgo')
  return formatDate(date, {})
}

/** A local calendar day as `<input type="date">` uses it (YYYY-MM-DD). */
export function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The end of a local calendar day (YYYY-MM-DD) as ISO timestamp. */
export function endOfDay(day: string): string {
  return new Date(`${day}T23:59:59`).toISOString()
}
