/** Whether the user asked the system for less motion (animations are then skipped). */
export const reducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Waits the given time; for short pauses that make a quick answer noticeable. */
export const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms))
