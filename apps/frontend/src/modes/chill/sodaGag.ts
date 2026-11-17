import { GAG_ROUNDS, type GagLine, type PipState } from './script'

export type GagSnapshot = { line: GagLine | null; pip: PipState }

const IDLE: GagSnapshot = { line: null, pip: 'here' }

type Options = {
  /** Wait before the first attempt. */
  firstMs?: number
  /** Wait between attempts. */
  everyMs?: number
  /** Wait before asking again when `canPlay` said no. */
  retryMs?: number
  /** Overrides the length of every beat (for tests). */
  stepMs?: number
  /** The gag stops for good after this many plays. */
  maxRounds?: number
  /** Asked before each attempt; when false the attempt is skipped. */
  canPlay?: () => boolean
}

/**
 * Pip tries to order a soda now and then: he asks, Gus refuses, he leaves, is
 * gone for a beat, and sneaks back in. It only ever sets a snapshot for the UI
 * to show and never touches the chat. One timer at a time, none while the
 * controller is inactive, and it ends after `maxRounds`.
 */
export function createSodaGag({
  firstMs = 15_000,
  everyMs = 45_000,
  retryMs = 4_000,
  stepMs,
  maxRounds = 8,
  canPlay = () => true,
}: Options = {}) {
  let snapshot: GagSnapshot = IDLE
  let isActive = false
  let played = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()

  const show = (next: GagSnapshot) => {
    snapshot = next
    listeners.forEach(listener => listener())
  }

  const wait = (ms: number) => {
    timer = setTimeout(() => {
      if (canPlay()) play(0)
      else wait(retryMs)
    }, ms)
  }

  const play = (index: number) => {
    const steps = GAG_ROUNDS[played % GAG_ROUNDS.length] ?? []
    const step = steps[index]
    if (!step) {
      show(IDLE)
      played += 1
      if (played < maxRounds) wait(everyMs)
      return
    }
    show({ line: step.line ?? null, pip: step.pip })
    timer = setTimeout(() => play(index + 1), stepMs ?? step.ms)
  }

  const clear = () => {
    clearTimeout(timer)
    timer = undefined
    if (snapshot !== IDLE) show(IDLE)
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    /** Starts the schedule. Returns the cleanup that stops it. */
    activate() {
      isActive = true
      wait(firstMs)
      return () => {
        isActive = false
        clear()
      }
    },
    /** Cuts the gag short (e.g. Gus went on break): Pip is back at the bar, and it tries again later. */
    interrupt() {
      if (!isActive || snapshot === IDLE) return
      clear()
      wait(everyMs)
    },
  }
}

export type SodaGag = ReturnType<typeof createSodaGag>
