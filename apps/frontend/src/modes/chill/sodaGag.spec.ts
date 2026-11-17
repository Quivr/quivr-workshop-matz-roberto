import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GAG_ROUNDS } from './script'
import { createSodaGag } from './sodaGag'

const options = { firstMs: 1000, everyMs: 5000, maxRounds: 2 }
const ROUND_MS = (GAG_ROUNDS[0] ?? []).reduce(
  (total, step) => total + step.ms,
  0
)

/** Records every snapshot the gag publishes. */
const record = (gag: ReturnType<typeof createSodaGag>) => {
  const seen: { pip: string; speaker?: string }[] = []
  gag.subscribe(() => {
    const { pip, line } = gag.getSnapshot()
    seen.push({ pip, speaker: line?.speaker })
  })
  return seen
}

describe('soda gag', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs ask, refused, leaves, away, returns, in that order', () => {
    const gag = createSodaGag(options)
    const seen = record(gag)
    gag.activate()
    expect(gag.getSnapshot()).toEqual({ line: null, pip: 'here' })
    vi.advanceTimersByTime(1000)
    expect(gag.getSnapshot().line?.speaker).toBe('pip')
    expect(gag.getSnapshot().pip).toBe('here')
    vi.advanceTimersByTime(3000)
    expect(gag.getSnapshot().line?.speaker).toBe('gus')
    expect(gag.getSnapshot().line?.text).toMatch(/only/i)
    vi.advanceTimersByTime(ROUND_MS)

    const states = seen.map(s => s.pip)
    expect(states.filter((s, i) => s !== states[i - 1])).toEqual([
      'here',
      'leaving',
      'away',
      'returning',
      'here',
    ])
    const speakers = seen.flatMap(s => (s.speaker ? [s.speaker] : []))
    expect(speakers.slice(0, 3)).toEqual(['pip', 'gus', 'pip'])
    expect(gag.getSnapshot()).toEqual({ line: null, pip: 'here' })
  })

  it('keeps Pip away for a beat, not a flicker', () => {
    const gag = createSodaGag(options)
    gag.activate()
    vi.advanceTimersByTime(1000 + 3000 + 3000 + 2500 + 1500)
    expect(gag.getSnapshot().pip).toBe('away')
    vi.advanceTimersByTime(3200 + 1500 - 1)
    expect(gag.getSnapshot().pip).toBe('away')
    vi.advanceTimersByTime(1)
    expect(gag.getSnapshot().pip).toBe('returning')
  })

  it('runs again later with the next round', () => {
    const gag = createSodaGag(options)
    gag.activate()
    vi.advanceTimersByTime(1000 + ROUND_MS + 5000)
    expect(gag.getSnapshot().line?.text).toBe(GAG_ROUNDS[1]?.[0]?.line?.text)
    expect(gag.getSnapshot().pip).toBe('here')
  })

  it('stops for good after maxRounds', () => {
    const gag = createSodaGag(options)
    gag.activate()
    vi.advanceTimersByTime(10 * (ROUND_MS + 5000))
    expect(gag.getSnapshot()).toEqual({ line: null, pip: 'here' })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('leaves nothing running once stopped, even while Pip is away', () => {
    const gag = createSodaGag(options)
    const stop = gag.activate()
    vi.advanceTimersByTime(1000 + 3000 + 3000 + 2500 + 1500 + 100)
    expect(gag.getSnapshot().pip).toBe('away')
    stop()
    expect(gag.getSnapshot()).toEqual({ line: null, pip: 'here' })
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(10 * (ROUND_MS + 5000))
    expect(gag.getSnapshot().pip).toBe('here')
  })

  it('skips an attempt while it cannot play, then tries again later', () => {
    let canPlay = false
    const gag = createSodaGag({ ...options, canPlay: () => canPlay })
    gag.activate()
    vi.advanceTimersByTime(1000)
    expect(gag.getSnapshot().line).toBeNull()
    canPlay = true
    vi.advanceTimersByTime(5000)
    expect(gag.getSnapshot().line?.speaker).toBe('pip')
  })

  it('brings Pip back when interrupted while he is away', () => {
    const gag = createSodaGag(options)
    gag.activate()
    vi.advanceTimersByTime(1000 + 3000 + 3000 + 2500 + 1500 + 100)
    expect(gag.getSnapshot().pip).toBe('away')
    gag.interrupt()
    expect(gag.getSnapshot()).toEqual({ line: null, pip: 'here' })
    vi.advanceTimersByTime(5000)
    expect(gag.getSnapshot().line?.speaker).toBe('pip')
  })
})
