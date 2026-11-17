import type { Exchange } from './banter'
import type { GagLine } from './script'

export type BanterSnapshot = { line: GagLine | null }

const IDLE: BanterSnapshot = { line: null }

type Options = {
  /** The exchanges that may be played, best first. Read again at every attempt. */
  source: () => Exchange[]
  firstMs?: number
  everyMs?: number
  /** How long each line stays up. */
  lineMs?: number
  /** Wait before asking again when `canPlay` said no. */
  retryMs?: number
  /** Hard cap on exchanges per session. Each exchange plays once, then never again. */
  maxExchanges?: number
  /** False while the student waits for an answer, Gus is on break, Pip's gag runs, … */
  canPlay?: () => boolean
}

/**
 * The regulars chat among themselves, one line at a time, one exchange every
 * so often. Scripted lines only: no LLM, no tool call. One timer at a time,
 * none while inactive, and it ends after `maxExchanges` or when the source
 * has nothing new.
 */
export function createBanter({
  source,
  firstMs = 6_000,
  everyMs = 22_000,
  lineMs = 3_500,
  retryMs = 4_000,
  maxExchanges = 8,
  canPlay = () => true,
}: Options) {
  let snapshot: BanterSnapshot = IDLE
  let isActive = false
  let played = 0
  const done = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()

  const show = (next: BanterSnapshot) => {
    snapshot = next
    listeners.forEach(listener => listener())
  }

  const wait = (ms: number) => {
    timer = setTimeout(attempt, ms)
  }

  const attempt = () => {
    if (!canPlay()) return wait(retryMs)
    const exchange = source().find(candidate => !done.has(candidate.id))
    if (!exchange) return
    play(exchange, 0)
  }

  const play = (exchange: Exchange, index: number) => {
    const line = exchange.lines[index]
    if (!line) {
      show(IDLE)
      done.add(exchange.id)
      played += 1
      if (played < maxExchanges) wait(everyMs)
      return
    }
    show({ line })
    timer = setTimeout(() => play(exchange, index + 1), lineMs)
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
    /** Drops the line being said (the student wrote, Gus left) and tries again later. */
    interrupt() {
      if (!isActive || snapshot === IDLE) return
      clear()
      wait(everyMs)
    },
  }
}

export type Banter = ReturnType<typeof createBanter>
