import { describe, expect, it } from 'vitest'

import {
  argumentReducer,
  firstPresent,
  initialState,
  MAX_TURNS,
  nextSpeaker,
  speakerForTurn,
  type ArgumentAction,
} from './turns'

const CAST = ['nova', 'rex', 'mira'] as const

const run = (actions: ArgumentAction[], from = initialState(CAST)) =>
  actions.reduce(argumentReducer, from)

const started = () => run([{ type: 'start', topic: 'lunch' }])
const finish: ArgumentAction = { type: 'turnFinished' }
const turns = (count: number) =>
  Array.from({ length: count }, (): ArgumentAction => finish)

describe('speakerForTurn', () => {
  it('goes round robin through the cast', () => {
    expect([0, 1, 2, 3, 4].map(turn => speakerForTurn(CAST, turn))).toEqual([
      'nova',
      'rex',
      'mira',
      'nova',
      'rex',
    ])
  })

  it('has no speaker for an empty cast', () => {
    expect(speakerForTurn([], 0)).toBeNull()
  })
})

describe('argumentReducer', () => {
  it('starts idle with nobody speaking', () => {
    expect(initialState(CAST)).toMatchObject({ status: 'idle', speaker: null })
  })

  it('gives the first turn to the first character', () => {
    expect(started()).toMatchObject({
      status: 'running',
      topic: 'lunch',
      speaker: 'nova',
      turn: 0,
    })
  })

  it('ignores a second start', () => {
    expect(run([{ type: 'start', topic: 'other' }], started()).topic).toBe(
      'lunch'
    )
  })

  it('passes the floor on when a turn finishes', () => {
    expect(run([finish], started())).toMatchObject({ speaker: 'rex', turn: 1 })
  })

  it('stops after the turn limit and waits for the student', () => {
    expect(MAX_TURNS).toBe(8)
    expect(run(turns(MAX_TURNS), started())).toMatchObject({
      status: 'ended',
      endReason: 'limit',
      speaker: null,
      turn: MAX_TURNS,
    })
  })

  it('is still running one turn before the limit', () => {
    const state = run(turns(MAX_TURNS - 1), started())
    expect(state.status).toBe('running')
    expect(state.speaker).toBe(speakerForTurn(CAST, MAX_TURNS - 1))
  })

  it('never goes past the limit, whatever arrives afterwards', () => {
    const state = run(turns(MAX_TURNS + 5), started())
    expect(state.turn).toBe(MAX_TURNS)
    expect(state.status).toBe('ended')
  })

  it('stops at once on "Stop it!"', () => {
    expect(run([finish, { type: 'stop' }], started())).toMatchObject({
      status: 'ended',
      endReason: 'button',
      speaker: null,
    })
  })

  it('stops at once when the student types', () => {
    expect(run([{ type: 'studentMessage' }], started())).toMatchObject({
      status: 'ended',
      endReason: 'student',
      speaker: null,
    })
  })

  it('ignores a turn that finishes after the stop', () => {
    const stopped = run([{ type: 'stop' }], started())
    expect(run([finish], stopped)).toEqual(stopped)
  })

  it('ends with an error instead of looping when a turn fails', () => {
    expect(
      run([{ type: 'turnFailed', error: 'boom' }], started())
    ).toMatchObject({ status: 'ended', endReason: 'error', error: 'boom' })
  })

  it('does not start again once it has ended', () => {
    const ended = run([{ type: 'stop' }], started())
    expect(run([{ type: 'start', topic: 'again' }], ended)).toEqual(ended)
  })

  it('ignores stop and student messages while idle', () => {
    const idle = initialState(CAST)
    expect(run([{ type: 'stop' }, { type: 'studentMessage' }], idle)).toEqual(
      idle
    )
  })
})

describe('an argument with a character away', () => {
  const away = ['rex']

  it('starts without the one who is away', () => {
    expect(
      run([{ type: 'start', topic: 'lunch', away: ['nova'] }])
    ).toMatchObject({ status: 'running', speaker: 'rex' })
  })

  it('skips the one who is away and never repeats the speaker', () => {
    let state = started()
    const spoken = [state.speaker]
    for (let i = 0; i < 5; i++) {
      state = argumentReducer(state, { type: 'turnFinished', away })
      spoken.push(state.speaker)
    }
    expect(spoken).toEqual(['nova', 'mira', 'nova', 'mira', 'nova', 'mira'])
  })

  it('lets the character back in when he is no longer away', () => {
    let state = run([{ type: 'turnFinished', away }], started())
    expect(state.speaker).toBe('mira')
    state = argumentReducer(state, { type: 'turnFinished' })
    expect(state.speaker).toBe('nova')
    state = argumentReducer(state, { type: 'turnFinished' })
    expect(state.speaker).toBe('rex')
  })

  it('does not count a skipped turn: the cap is still MAX_TURNS finished turns', () => {
    const state = run(
      turns(MAX_TURNS).map((): ArgumentAction => ({
        type: 'turnFinished',
        away,
      })),
      started()
    )
    expect(state).toMatchObject({
      status: 'ended',
      endReason: 'limit',
      turn: MAX_TURNS,
    })
  })

  it('ends instead of hanging when too few characters are left', () => {
    const state = run(
      [{ type: 'turnFinished', away: ['rex', 'mira'] }],
      started()
    )
    expect(state).toMatchObject({
      status: 'ended',
      endReason: 'empty',
      speaker: null,
    })
    expect(
      run([{ type: 'start', topic: 'x', away: ['nova', 'rex'] }])
    ).toMatchObject({ status: 'ended', endReason: 'empty' })
  })

  it('behaves like before when nobody is away', () => {
    const cast = ['nova', 'rex', 'mira']
    for (let turn = 0; turn < 6; turn++) {
      expect(nextSpeaker(cast, [], cast[(turn + 2) % 3]!)).toBe(
        speakerForTurn(cast, turn)
      )
    }
  })
})

describe('firstPresent', () => {
  it('looks from a position and wraps', () => {
    expect(firstPresent(CAST, 1, ['rex'])).toBe('mira')
    expect(firstPresent(CAST, 2, ['mira'])).toBe('nova')
    expect(firstPresent(CAST, 0, [...CAST])).toBeNull()
  })
})
