import { describe, expect, it } from 'vitest'

import { argumentClip } from './clips'
import { argumentReducer, initialState } from './turns'

const CAST = ['nova', 'rex', 'mira']
const running = argumentReducer(initialState(CAST), {
  type: 'start',
  topic: 'lunch',
})

describe('argumentClip', () => {
  it('is idle before the argument', () => {
    expect(argumentClip(initialState(CAST), 'nova', false)).toBe('idle')
  })

  it('has the speaker fight and the others argue', () => {
    expect(argumentClip(running, 'nova', false)).toBe('fight')
    expect(argumentClip(running, 'rex', false)).toBe('argue')
  })

  it('calms down once it is over, except for whoever is talking', () => {
    const ended = argumentReducer(running, { type: 'stop' })
    expect(argumentClip(ended, 'nova', false)).toBe('calm')
    expect(argumentClip(ended, 'nova', true)).toBe('talking')
  })
})
