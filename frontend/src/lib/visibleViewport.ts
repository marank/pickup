type Viewport = Pick<VisualViewport, 'height' | 'offsetTop' | 'addEventListener'>

/**
 * The part of the page that is actually visible, as CSS values on the root element:
 * `--vv-top` and `--vv-height`, plus the class `vv` once they are set. On phones the
 * on-screen keyboard makes this area smaller (the layout viewport stays as it is), so
 * dialogs can centre themselves above the keyboard. Without visualViewport nothing is set
 * and dialogs keep their fallback position.
 */
export function initVisibleViewport(
  root: HTMLElement = document.documentElement,
  viewport: Viewport | null = window.visualViewport,
): void {
  if (!viewport) return
  const update = () => {
    root.style.setProperty('--vv-top', `${viewport.offsetTop}px`)
    root.style.setProperty('--vv-height', `${viewport.height}px`)
  }
  update()
  root.classList.add('vv')
  viewport.addEventListener('resize', update)
  viewport.addEventListener('scroll', update)
}
