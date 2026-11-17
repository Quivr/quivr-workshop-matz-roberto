/** The few things the argument waits for between two runs. Both give up on abort, leaving nothing behind. */

type Visibility = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>

/**
 * Resolves true once the tab is visible (at once when it already is), or
 * false when `signal` aborts first. Same rule as the bar's ambient life: no
 * background work while the tab is hidden. One listener, always removed.
 */
export const waitUntilVisible = (
  signal: AbortSignal,
  isHidden: () => boolean = () => document.hidden,
  target: Visibility = document
): Promise<boolean> =>
  new Promise(resolve => {
    if (signal.aborted) return resolve(false)
    if (!isHidden()) return resolve(true)
    const finish = (visible: boolean) => {
      target.removeEventListener('visibilitychange', onChange)
      signal.removeEventListener('abort', onAbort)
      resolve(visible)
    }
    const onChange = () => {
      if (!isHidden()) finish(true)
    }
    const onAbort = () => finish(false)
    target.addEventListener('visibilitychange', onChange)
    signal.addEventListener('abort', onAbort)
  })

/** Resolves true after `ms`, or false when `signal` aborts first. The timer is always cleared. */
export const pause = (ms: number, signal: AbortSignal): Promise<boolean> =>
  new Promise(resolve => {
    if (signal.aborted) return resolve(false)
    const finish = (completed: boolean) => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      resolve(completed)
    }
    const onAbort = () => finish(false)
    const timer = setTimeout(() => finish(true), ms)
    signal.addEventListener('abort', onAbort)
  })
