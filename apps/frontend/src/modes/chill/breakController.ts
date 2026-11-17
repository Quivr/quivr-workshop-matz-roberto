import {
  BREAK_EVERY,
  chillBreakMs,
  finishTurn,
  initialBreakState,
  remainingMs,
  submitMessage,
  tick,
  type BreakState,
  type Reply,
} from './breakMachine'

export type BreakSnapshot = {
  phase: BreakState['phase']
  /** Time left on the break, in ms. Counts down once a second. */
  remainingMs: number
  /** Time since the break began, in ms. */
  elapsedMs: number
}

export type BreakEvent = 'break-start' | 'break-end'

type Options = {
  every?: number
  durationMs?: number
  now?: () => number
  tickMs?: number
}

/**
 * Runs the break state machine on real time. The end of the break is one
 * exact timeout and the countdown is a one-second interval, both only alive
 * while a break lasts and while the controller is active.
 *
 * `useSyncExternalStore`-shaped: `subscribe` + `getSnapshot`.
 */
export function createBreakController({
  every = BREAK_EVERY,
  durationMs = chillBreakMs(),
  now = Date.now,
  tickMs = 1000,
}: Options = {}) {
  let state: BreakState = initialBreakState
  let snapshot: BreakSnapshot = {
    phase: 'chatting',
    remainingMs: 0,
    elapsedMs: 0,
  }
  let isActive = false
  let generation = 0
  let endTimer: ReturnType<typeof setTimeout> | undefined
  let tickTimer: ReturnType<typeof setInterval> | undefined
  const listeners = new Set<() => void>()
  const eventListeners = new Set<(event: BreakEvent) => void>()

  const clearTimers = () => {
    clearTimeout(endTimer)
    clearInterval(tickTimer)
    endTimer = tickTimer = undefined
  }

  const publish = () => {
    const left = remainingMs(state, now())
    snapshot = {
      phase: state.phase,
      remainingMs: left,
      elapsedMs: state.phase === 'break' ? durationMs - left : 0,
    }
    listeners.forEach(listener => listener())
  }

  const emit = (event: BreakEvent) =>
    eventListeners.forEach(listener => listener(event))

  const endBreak = () => {
    clearTimers()
    state = tick(state, now())
    publish()
    emit('break-end')
  }

  const startBreak = () => {
    state = finishTurn(state, now(), durationMs)
    if (state.phase !== 'break') return
    endTimer = setTimeout(endBreak, durationMs)
    tickTimer = setInterval(publish, tickMs)
    publish()
    emit('break-start')
  }

  const submit = (): Reply => {
    const result = submitMessage(state, every)
    state = result.state
    return result.reply
  }

  const turnEnded = () => {
    if (isActive) startBreak()
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    onEvent(listener: (event: BreakEvent) => void) {
      eventListeners.add(listener)
      return () => eventListeners.delete(listener)
    },
    /** Marks the controller live. Returns the cleanup that stops all timers. */
    activate() {
      isActive = true
      return () => {
        isActive = false
        clearTimers()
      }
    },
    submit,
    turnEnded,
    /**
     * Routes a student message. On break it goes to `sleepy` (a scripted
     * reply: `ask` is never called, so no agent run, no tools, no LLM).
     * Otherwise `ask` runs the agent and a break may start when it settles.
     */
    route(
      text: string,
      handlers: {
        ask: (text: string) => Promise<unknown>
        sleepy: (text: string) => void
      }
    ) {
      if (submit() === 'sleepy') return handlers.sleepy(text)
      const runGeneration = generation
      const settle = () => {
        if (runGeneration === generation) turnEnded()
      }
      // `ask` reports its own errors; failed or not, the turn is over.
      void handlers.ask(text).then(settle, settle)
    },
    /** New chat: forget the count and any break. */
    reset() {
      generation += 1
      clearTimers()
      state = initialBreakState
      publish()
    },
  }
}

export type BreakController = ReturnType<typeof createBreakController>
