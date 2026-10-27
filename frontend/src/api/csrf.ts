const COOKIE = 'csrftoken'

/** Django's CSRF token from its cookie; re-read on every request (Django may rotate it). */
export function getCsrfToken(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
}

/** Make sure the CSRF cookie exists before the first unsafe request. */
export async function ensureCsrf(): Promise<void> {
  if (!getCsrfToken()) await fetch('/api/csrf', { credentials: 'same-origin' })
}
