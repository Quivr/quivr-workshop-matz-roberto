import { describe, expect, it } from 'vitest'

import { getCharacter } from '../../characters/registry'
import {
  BREAK_BANTER,
  GAG_ROUNDS,
  RESPONDER_ID,
  SLEEPY_REPLIES,
  sleepyReply,
} from './script'

const gagLines = () =>
  GAG_ROUNDS.flatMap(steps => steps.flatMap(step => step.line ?? []))

describe('bar script', () => {
  it('only gives lines to characters that exist, in the bar', () => {
    const speakers = [
      RESPONDER_ID,
      BREAK_BANTER.speaker,
      ...gagLines().map(line => line.speaker),
    ]
    for (const id of speakers) expect(getCharacter(id), id).toBeDefined()
  })

  it('has Pip ask, Gus refuse, Pip leave and come back in every round', () => {
    for (const steps of GAG_ROUNDS) {
      const lines = steps.flatMap(step => step.line ?? [])
      expect(lines[0]?.speaker).toBe('pip')
      expect(lines[1]?.speaker).toBe('gus')
      expect(lines[1]?.text).toMatch(/only/i)
      const states = steps.map(step => step.pip)
      expect(states.filter((s, i) => s !== states[i - 1])).toEqual([
        'here',
        'leaving',
        'away',
        'returning',
        'here',
      ])
    }
  })

  it('lets the slide out and in finish before the next beat', () => {
    for (const step of GAG_ROUNDS.flat()) {
      if (step.pip === 'leaving' || step.pip === 'returning') {
        expect(step.ms).toBeGreaterThanOrEqual(1500)
      }
    }
  })

  it('cycles the sleepy replies and each one says to ask later', () => {
    expect(sleepyReply(SLEEPY_REPLIES.length)).toBe(sleepyReply(0))
    for (const reply of SLEEPY_REPLIES) expect(reply).toMatch(/break|Stella/)
  })
})
