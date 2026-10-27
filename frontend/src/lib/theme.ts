/** Follow the system's light/dark preference (shadcn components switch on `.dark`). */
export function followSystemTheme(root: HTMLElement = document.documentElement): void {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () => root.classList.toggle('dark', query.matches)
  apply()
  query.addEventListener('change', apply)
}
