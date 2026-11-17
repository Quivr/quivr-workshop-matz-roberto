import { describe, expect, it } from 'vitest'

import {
  argumentReducer,
  initialState,
  MAX_TURNS,
  speakerForTurn,
  type ArgumentAction,
  type ArgumentState,
} from './turns'

const CAST = ['nova', 'rex', 'mira'] as const

const run = (actions: ArgumentAction[], from = initialState(CAST)) =>
  actions.reduce(argumentReducer, from)

const started = () => run([{ type: 'start', topic: 'lunch' }])
const say = (text: string): ArgumentAction => ({ type: 'turnFinished', text })

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
    const state = initialState(CAST)
    expect(state.status).toBe('idle')
    expect(state.speaker).toBeNull()
  })

  it('gives the first turn to the first character', () => {
    const state = started()
    expect(state).toMatchObject({
      status: 'running',
      topic: 'lunch',
      speaker: 'nova',
      turn: 0,
    })
  })

  it('ignores a second start', () => {
    const state = run([{ type: 'start', topic: 'other' }], started())
    expect(state.topic).toBe('lunch')
  })

  it('passes the turn on when a message is finished', () => {
    const state = run([say('Alma 2 wins')], started())
    expect(state.speaker).toBe('rex')
    expect(state.turn).toBe(1)
  })

  it('adds the finished message to the other two inboxes, not the speaker', () => {
    const state = run([say('  Alma 2 wins  ')], started())
    const heard = { id: 'turn-1', from: 'nova', text: 'Alma 2 wins' }
    expect(state.inbox).toEqual({ nova: [], rex: [heard], mira: [heard] })
  })

  it('keeps messages in order until the character is given them', () => {
    const state = run([say('one'), say('two')], started())
    expect(state.inbox.mira?.map(h => [h.from, h.text])).toEqual([
      ['nova', 'one'],
      ['rex', 'two'],
    ])
    expect(state.inbox.nova?.map(h => h.text)).toEqual(['two'])
  })

  it('empties an inbox once delivered', () => {
    const state = run(
      [say('one'), { type: 'delivered', characterId: 'rex' }],
      started()
    )
    expect(state.inbox.rex).toEqual([])
    expect(state.inbox.mira).toHaveLength(1)
  })

  it('stops after the turn limit and waits for the student', () => {
    const state = run(
      Array.from({ length: MAX_TURNS }, (_, i) => say(`turn ${i + 1}`)),
      started()
    )
    expect(MAX_TURNS).toBe(8)
    expect(state).toMatchObject({
      status: 'ended',
      endReason: 'limit',
      speaker: null,
      turn: MAX_TURNS,
    })
  })

  it('is still running after one turn less than the limit', () => {
    const state = run(
      Array.from({ length: MAX_TURNS - 1 }, (_, i) => say(`turn ${i + 1}`)),
      started()
    )
    expect(state.status).toBe('running')
    expect(state.speaker).toBe(speakerForTurn(CAST, MAX_TURNS - 1))
  })

  it('never goes past the limit, whatever arrives afterwards', () => {
    const state = run(
      Array.from({ length: MAX_TURNS + 5 }, (_, i) => say(`turn ${i + 1}`)),
      started()
    )
    expect(state.turn).toBe(MAX_TURNS)
    expect(state.status).toBe('ended')
  })

  it('stops at once on "Stop it!"', () => {
    const state = run([say('one'), { type: 'stop' }], started())
    expect(state).toMatchObject({
      status: 'ended',
      endReason: 'button',
      speaker: null,
    })
  })

  it('stops at once when the student types', () => {
    const state = run([{ type: 'studentMessage' }], started())
    expect(state).toMatchObject({
      status: 'ended',
      endReason: 'student',
      speaker: null,
    })
  })

  it('drops a message that finishes after the stop', () => {
    const stopped = run([{ type: 'stop' }], started())
    const state = run([say('too late')], stopped)
    expect(state).toEqual(stopped)
  })

  it('ends with an error instead of looping when a turn fails or is empty', () => {
    expect(
      run([{ type: 'turnFailed', error: 'boom' }], started())
    ).toMatchObject({ status: 'ended', endReason: 'error', error: 'boom' })
    expect(run([say('   ')], started())).toMatchObject({
      status: 'ended',
      endReason: 'error',
    })
  })

  it('does not start again once it has ended', () => {
    const ended: ArgumentState = run([{ type: 'stop' }], started())
    expect(run([{ type: 'start', topic: 'again' }], ended)).toEqual(ended)
  })

  it('ignores stop and student messages while idle', () => {
    const idle = initialState(CAST)
    expect(run([{ type: 'stop' }, { type: 'studentMessage' }], idle)).toEqual(
      idle
    )
  })
})
