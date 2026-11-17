import { describe, expect, it } from 'vitest'

import {
  argumentReducer,
  initialState,
  MAX_TURNS,
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
