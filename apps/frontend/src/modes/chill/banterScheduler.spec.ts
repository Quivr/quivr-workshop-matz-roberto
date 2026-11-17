import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Exchange } from './banter'
import { createBanter } from './banterScheduler'

const exchange = (id: string, ...speakers: ('gus' | 'bram')[]): Exchange => ({
  id,
  lines: speakers.map((speaker, i) => ({
    speaker,
    text: `${id} line ${i + 1}`,
  })),
})

const options = { firstMs: 1000, everyMs: 5000, lineMs: 1000, retryMs: 500 }
const A = exchange('a', 'gus', 'bram')
const B = exchange('b', 'bram')

describe('banter scheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('plays an exchange one line at a time, then goes quiet', () => {
    const banter = createBanter({ source: () => [A], ...options })
    banter.activate()
    expect(banter.getSnapshot().line).toBeNull()
    vi.advanceTimersByTime(1000)
    expect(banter.getSnapshot().line?.text).toBe('a line 1')
    vi.advanceTimersByTime(1000)
    expect(banter.getSnapshot().line?.text).toBe('a line 2')
    vi.advanceTimersByTime(1000)
    expect(banter.getSnapshot().line).toBeNull()
  })

  it('only plays lines that come from the source', () => {
    const seen: string[] = []
    const banter = createBanter({ source: () => [A, B], ...options })
    banter.subscribe(() => {
      const line = banter.getSnapshot().line
      if (line) seen.push(line.text)
    })
    banter.activate()
    vi.advanceTimersByTime(60_000)
    expect(seen).toEqual(['a line 1', 'a line 2', 'b line 1'])
  })

  it('plays each exchange once, then stops with no timer left', () => {
    const banter = createBanter({ source: () => [A, B], ...options })
    banter.activate()
    vi.advanceTimersByTime(120_000)
    expect(banter.getSnapshot().line).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('respects its cap', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map(id => exchange(id, 'gus'))
    const seen: string[] = []
    const banter = createBanter({
      source: () => many,
      maxExchanges: 3,
      ...options,
    })
    banter.subscribe(() => {
      const line = banter.getSnapshot().line
      if (line) seen.push(line.text)
    })
    banter.activate()
    vi.advanceTimersByTime(120_000)
    expect(seen).toHaveLength(3)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('says nothing when the source has nothing', () => {
    const banter = createBanter({ source: () => [], ...options })
    banter.activate()
    vi.advanceTimersByTime(120_000)
    expect(banter.getSnapshot().line).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reads the source again at each attempt, so late facts are used', () => {
    const list: Exchange[] = [A]
    const seen: string[] = []
    const banter = createBanter({ source: () => list, ...options })
    banter.subscribe(() => {
      const line = banter.getSnapshot().line
      if (line) seen.push(line.text)
    })
    banter.activate()
    vi.advanceTimersByTime(1000)
    list.unshift(B)
    vi.advanceTimersByTime(60_000)
    expect(seen).toEqual(['a line 1', 'a line 2', 'b line 1'])
  })

  it('pauses while it cannot play (break, answer pending) and resumes after', () => {
    let canPlay = false
    const banter = createBanter({
      source: () => [A],
      canPlay: () => canPlay,
      ...options,
    })
    banter.activate()
    vi.advanceTimersByTime(10_000)
    expect(banter.getSnapshot().line).toBeNull()
    canPlay = true
    vi.advanceTimersByTime(500)
    expect(banter.getSnapshot().line?.text).toBe('a line 1')
  })

  it('can be interrupted, and then tries the same exchange again later', () => {
    const banter = createBanter({ source: () => [A], ...options })
    banter.activate()
    vi.advanceTimersByTime(1000)
    banter.interrupt()
    expect(banter.getSnapshot().line).toBeNull()
    vi.advanceTimersByTime(5000)
    expect(banter.getSnapshot().line?.text).toBe('a line 1')
  })

  it('leaves nothing running once stopped', () => {
    const banter = createBanter({ source: () => [A, B], ...options })
    const stop = banter.activate()
    vi.advanceTimersByTime(1500)
    expect(banter.getSnapshot().line).not.toBeNull()
    stop()
    expect(banter.getSnapshot().line).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(120_000)
    expect(banter.getSnapshot().line).toBeNull()
  })
})
