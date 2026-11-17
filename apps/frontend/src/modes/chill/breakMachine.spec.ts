import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BREAK_EVERY,
  DEFAULT_BREAK_MS,
  chillBreakMs,
  finishTurn,
  formatRemaining,
  initialBreakState,
  parseBreakMs,
  remainingMs,
  submitMessage,
  tick,
  type BreakState,
} from './breakMachine'

const BREAK = 10_000

/** One student message and its finished answer. */
function turn(state: BreakState, now = 0, every = BREAK_EVERY) {
  const result = submitMessage(state, every)
  return {
    reply: result.reply,
    state: finishTurn(result.state, now, BREAK),
  }
}

describe('break state machine', () => {
  it('fires on the 5th student message, not before', () => {
    let state = initialBreakState
    for (let i = 1; i < BREAK_EVERY; i++) {
      state = turn(state).state
      expect(state.phase).toBe('chatting')
    }
    state = turn(state).state
    expect(state.phase).toBe('break')
  })

  it('answers the 5th message normally, then starts the break once it is done', () => {
    let state = initialBreakState
    for (let i = 1; i < BREAK_EVERY; i++) state = turn(state).state
    const fifth = submitMessage(state)
    expect(fifth.reply).toBe('answer')
    expect(fifth.state.phase).toBe('chatting')
    expect(fifth.state.breakDue).toBe(true)
    expect(finishTurn(fifth.state, 0, BREAK).phase).toBe('break')
  })

  it('never fires twice in a row', () => {
    // Every message makes a break due, so only the guard spaces them out.
    let state = turn(initialBreakState, 0, 1).state
    expect(state.phase).toBe('break')
    state = tick(state, BREAK)
    expect(state.phase).toBe('chatting')
    state = turn(state, BREAK, 1).state
    expect(state.phase).toBe('chatting')
    state = turn(state, BREAK, 1).state
    expect(state.phase).toBe('break')
  })

  it('counts 5 fresh messages after a break', () => {
    let state = turn(initialBreakState, 0, 1).state
    state = tick(state, BREAK)
    for (let i = 1; i < BREAK_EVERY; i++) {
      state = turn(state, BREAK).state
      expect(state.phase).toBe('chatting')
    }
    expect(turn(state, BREAK).state.phase).toBe('break')
  })

  it('counts down and ends exactly when the time is up', () => {
    let state = initialBreakState
    for (let i = 0; i < BREAK_EVERY; i++) state = turn(state, 1000).state
    expect(remainingMs(state, 1000)).toBe(BREAK)
    expect(remainingMs(state, 4000)).toBe(BREAK - 3000)
    expect(tick(state, 10_999).phase).toBe('break')
    expect(tick(state, 11_000).phase).toBe('chatting')
    expect(remainingMs(tick(state, 11_000), 11_000)).toBe(0)
  })

  it('gives a sleepy reply during a break, without changing the state', () => {
    let state = initialBreakState
    for (let i = 0; i < BREAK_EVERY; i++) state = turn(state).state
    const result = submitMessage(state)
    expect(result.reply).toBe('sleepy')
    expect(result.state).toBe(state)
  })
})

describe('break length', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('defaults to 5 minutes', () => {
    expect(DEFAULT_BREAK_MS).toBe(300_000)
    vi.stubEnv('VITE_CHILL_BREAK_MS', '')
    expect(chillBreakMs()).toBe(300_000)
  })

  it('is overridden by VITE_CHILL_BREAK_MS', () => {
    vi.stubEnv('VITE_CHILL_BREAK_MS', '10000')
    expect(chillBreakMs()).toBe(10_000)
  })

  it('falls back when the value is invalid', () => {
    for (const raw of ['abc', '0', '-5', 'Infinity', '  ', undefined, 42]) {
      expect(parseBreakMs(raw)).toBe(DEFAULT_BREAK_MS)
    }
    expect(parseBreakMs('2500')).toBe(2500)
  })

  it('formats the countdown as m:ss, rounded up', () => {
    expect(formatRemaining(300_000)).toBe('5:00')
    expect(formatRemaining(9_001)).toBe('0:10')
    expect(formatRemaining(1)).toBe('0:01')
    expect(formatRemaining(0)).toBe('0:00')
    expect(formatRemaining(-50)).toBe('0:00')
  })
})
