import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createReactions, reactionAt } from './reactions'

describe('reactionAt', () => {
  it('reacts at the third, fifth and seventh turn only', () => {
    const turns = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(
      turn => reactionAt(turn, []).length > 0
    )
    expect(turns).toEqual([2, 4, 6])
  })

  it('has Gus tell them to pipe down and Pip chime in', () => {
    expect(reactionAt(2, [])[0]).toMatchObject({ speaker: 'gus' })
    expect(reactionAt(4, []).map(line => line.speaker)).toEqual(['pip', 'gus'])
  })

  it('never has Gus speak while he is on a break', () => {
    for (const turn of [2, 4, 6]) {
      const speakers = reactionAt(turn, ['gus']).map(line => line.speaker)
      expect(speakers).not.toContain('gus')
      expect(speakers.length).toBeGreaterThan(0)
    }
  })

  it('says nothing about facts and never talks about drinking', () => {
    const text = [2, 4, 6]
      .flatMap(turn => reactionAt(turn, []).concat(reactionAt(turn, ['gus'])))
      .map(line => line.text)
      .join(' ')
    expect(text).not.toMatch(/\d|beer|drink|stella|pint/i)
  })
})

describe('createReactions', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const lines = [
    { speaker: 'pip', text: 'one' },
    { speaker: 'gus', text: 'two' },
  ] as const

  it('says the lines one after the other, then goes quiet', () => {
    const reactions = createReactions(1000)
    reactions.play(lines)
    expect(reactions.getSnapshot().line?.text).toBe('one')
    vi.advanceTimersByTime(1000)
    expect(reactions.getSnapshot().line?.text).toBe('two')
    vi.advanceTimersByTime(1000)
    expect(reactions.getSnapshot().line).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stop clears the line and the timer', () => {
    const reactions = createReactions(1000)
    reactions.play(lines)
    reactions.stop()
    expect(reactions.getSnapshot().line).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a new reaction replaces the old one without a second timer', () => {
    const reactions = createReactions(1000)
    reactions.play(lines)
    reactions.play([{ speaker: 'gus', text: 'three' }])
    expect(reactions.getSnapshot().line?.text).toBe('three')
    expect(vi.getTimerCount()).toBe(1)
  })
})
