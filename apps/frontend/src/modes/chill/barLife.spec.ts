import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBarLife } from './barLife'
import { createBreakController } from './breakController'

const FACTS = {
  schedule: [
    {
      title: 'Algebra',
      start: '2026-01-05T08:00:00+01:00',
      end: '2026-01-05T10:00:00+01:00',
      location: null,
    },
  ],
  classmates: [],
  menu: null,
}

const setup = (isHidden = () => false) => {
  const controller = createBreakController({ every: 1, durationMs: 60_000 })
  const stopController = controller.activate()
  const life = createBarLife(controller, isHidden)
  const stops = [stopController, life.gag.activate(), life.banter.activate()]
  const spoken: string[] = []
  const listen = (snapshot: () => { line: { text: string } | null }) => () => {
    const line = snapshot().line
    if (line) spoken.push(line.text)
  }
  life.gag.subscribe(listen(life.gag.getSnapshot))
  life.banter.subscribe(listen(life.banter.getSnapshot))
  return { controller, life, spoken, stop: () => stops.forEach(s => s()) }
}

describe('bar life', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('uses the fetched facts for its banter', () => {
    const { life, spoken } = setup()
    life.setFacts(FACTS)
    vi.advanceTimersByTime(6000)
    expect(spoken[0]).toContain('Algebra on Monday at 08:00')
  })

  it('never has the gag and the banter talking at once', () => {
    const { life } = setup()
    let both = false
    const check = () => {
      if (life.gag.getSnapshot().line && life.banter.getSnapshot().line)
        both = true
    }
    life.gag.subscribe(check)
    life.banter.subscribe(check)
    for (let i = 0; i < 400; i++) vi.advanceTimersByTime(1000)
    expect(both).toBe(false)
  })

  it('says nothing while the student waits for an answer', () => {
    const { life, spoken } = setup()
    life.setRunning(true)
    vi.advanceTimersByTime(14_000)
    expect(spoken).toEqual([])
    life.setRunning(false)
    vi.advanceTimersByTime(4000)
    expect(spoken.length).toBeGreaterThan(0)
  })

  it('stays quiet during a Stella break', async () => {
    const { controller, spoken } = setup()
    controller.route('hi', { ask: () => Promise.resolve(), sleepy: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.getSnapshot().phase).toBe('break')
    await vi.advanceTimersByTimeAsync(59_000)
    expect(spoken).toEqual([])
    await vi.advanceTimersByTimeAsync(10_000)
    expect(spoken.length).toBeGreaterThan(0)
  })

  it('stays quiet while the tab is hidden', () => {
    let hidden = true
    const { spoken } = setup(() => hidden)
    vi.advanceTimersByTime(60_000)
    expect(spoken).toEqual([])
    hidden = false
    vi.advanceTimersByTime(30_000)
    expect(spoken.length).toBeGreaterThan(0)
  })

  it('leaves no timer behind on unmount', () => {
    const { stop } = setup()
    vi.advanceTimersByTime(7000)
    stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
