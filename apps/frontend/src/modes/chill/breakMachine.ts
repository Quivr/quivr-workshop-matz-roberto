/** A break starts after this many answered student messages. The one number to tune. */
export const BREAK_EVERY = 5
export const DEFAULT_BREAK_MS = 5 * 60 * 1000

/** Reads a duration in ms from a raw env value. Unset, empty or invalid falls back. */
export function parseBreakMs(raw: unknown, fallback = DEFAULT_BREAK_MS) {
  if (typeof raw !== 'string' || raw.trim() === '') return fallback
  const ms = Math.round(Number(raw))
  return Number.isFinite(ms) && ms >= 1 ? ms : fallback
}

/** Break length: `VITE_CHILL_BREAK_MS` when valid, else 5 minutes. */
export const chillBreakMs = () =>
  parseBreakMs(import.meta.env.VITE_CHILL_BREAK_MS)

export type BreakState = {
  phase: 'chatting' | 'break'
  /** Student messages answered since the last break. */
  messages: number
  /** The 5th message was sent: the break starts once its answer is done. */
  breakDue: boolean
  /** The previous break ended and no message was answered since. */
  justHadBreak: boolean
  breakEndsAt: number | null
}

export const initialBreakState: BreakState = {
  phase: 'chatting',
  messages: 0,
  breakDue: false,
  justHadBreak: false,
  breakEndsAt: null,
}

export type Reply = 'answer' | 'sleepy'

/**
 * A student message. While on break it gets the scripted sleepy reply (the
 * caller must not call the agent); otherwise it is answered normally and may
 * make a break due. A break is never due right after a break.
 */
export function submitMessage(
  state: BreakState,
  every = BREAK_EVERY
): { state: BreakState; reply: Reply } {
  if (state.phase === 'break') return { state, reply: 'sleepy' }
  const messages = state.messages + 1
  return {
    reply: 'answer',
    state: {
      ...state,
      messages,
      breakDue: state.breakDue || (messages >= every && !state.justHadBreak),
      justHadBreak: false,
    },
  }
}

/** The answer to a student message is done: start the break if one is due. */
export function finishTurn(
  state: BreakState,
  now: number,
  durationMs: number
): BreakState {
  if (state.phase !== 'chatting' || !state.breakDue) return state
  return {
    phase: 'break',
    messages: 0,
    breakDue: false,
    justHadBreak: false,
    breakEndsAt: now + durationMs,
  }
}

export const remainingMs = (state: BreakState, now: number) =>
  state.phase === 'break' && state.breakEndsAt !== null
    ? Math.max(0, state.breakEndsAt - now)
    : 0

/** Ends the break once its time is up. */
export function tick(state: BreakState, now: number): BreakState {
  if (state.phase !== 'break' || remainingMs(state, now) > 0) return state
  return { ...initialBreakState, justHadBreak: true }
}

/** m:ss, rounded up so the clock reads 0:01 until the very end. */
export function formatRemaining(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000)
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
