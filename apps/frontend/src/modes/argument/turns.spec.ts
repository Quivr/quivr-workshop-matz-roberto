import { describe, expect, it } from 'vitest'

import {
  argumentReducer,
  firstPresent,
  initialState,
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

  it('has no turn cap by default: a hundred turns later it is still going', () => {
    const state = run(turns(100), started())
    expect(initialState(CAST).maxTurns).toBeNull()
    expect(state).toMatchObject({ status: 'running', turn: 100 })
    expect(state.speaker).toBe(speakerForTurn(CAST, 100))
  })

  describe('with a configured turn limit', () => {
    const limited = () =>
      run([{ type: 'start', topic: 'lunch' }], initialState(CAST, 5))

    it('is still running one turn before the limit', () => {
      const state = run(turns(4), limited())
      expect(state.status).toBe('running')
      expect(state.speaker).toBe(speakerForTurn(CAST, 4))
    })

    it('ends with "limit" at the limit and waits for the student', () => {
      expect(run(turns(5), limited())).toMatchObject({
        status: 'ended',
        endReason: 'limit',
        speaker: null,
        turn: 5,
      })
    })

    it('never goes past the limit, whatever arrives afterwards', () => {
      const state = run(turns(9), limited())
      expect(state.turn).toBe(5)
      expect(state.status).toBe('ended')
    })

    it('does not spend the limit on an interruption', () => {
      const state = run(
        [
          ...turns(2),
          { type: 'studentMessage' },
          { type: 'answered' },
          { type: 'resume' },
          ...turns(2),
        ],
        limited()
      )
      expect(state).toMatchObject({ status: 'running', turn: 4 })
    })
  })

  it('stops at once on "Stop it!"', () => {
    expect(run([finish, { type: 'stop' }], started())).toMatchObject({
      status: 'ended',
      endReason: 'button',
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

  it('does not count a skipped turn: a limit of 8 is still 8 finished turns', () => {
    const state = run(
      turns(8).map((): ArgumentAction => ({
        type: 'turnFinished',
        away,
      })),
      run([{ type: 'start', topic: 'lunch' }], initialState(CAST, 8))
    )
    expect(state).toMatchObject({
      status: 'ended',
      endReason: 'limit',
      turn: 8,
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

describe('a student message is an interruption, not an end', () => {
  const studentMessage: ArgumentAction = { type: 'studentMessage' }
  const interrupted = () => run([finish, studentMessage], started())

  it('does not end the argument: it calms down and waits for the answer', () => {
    expect(interrupted()).toMatchObject({
      status: 'answering',
      speaker: null,
      turn: 1,
    })
    expect(interrupted().endReason).toBeUndefined()
  })

  it('remembers who had the floor, so the order goes on after them', () => {
    expect(interrupted().floor).toBe('rex')
  })

  it('does not go on with turns while the student is being answered', () => {
    const state = interrupted()
    expect(run([finish, finish, { type: 'resume' }], state)).toEqual(state)
  })

  it('stays in the answer when the student writes again', () => {
    expect(run([studentMessage], interrupted())).toEqual(interrupted())
  })

  it('is calm for a beat once the answer is in', () => {
    expect(run([{ type: 'answered' }], interrupted())).toMatchObject({
      status: 'calm',
      speaker: null,
    })
  })

  it('does not count the interrupted turn, and goes on with the next one in the order', () => {
    const state = run([{ type: 'answered' }, { type: 'resume' }], interrupted())
    expect(state).toMatchObject({
      status: 'running',
      speaker: 'mira',
      turn: 1,
      resuming: true,
      floor: null,
    })
  })

  it('takes turns again after the resume, and stops saying it is resuming', () => {
    const state = run(
      [{ type: 'answered' }, { type: 'resume' }, finish, finish],
      interrupted()
    )
    expect(state).toMatchObject({
      status: 'running',
      speaker: 'rex',
      turn: 3,
      resuming: false,
    })
  })

  it('skips a character who is away when they pick it up again', () => {
    const state = run(
      [{ type: 'answered' }, { type: 'resume', away: ['mira'] }],
      interrupted()
    )
    expect(state.speaker).toBe('nova')
  })

  it('ends instead of hanging when too few are left to go on', () => {
    const state = run(
      [{ type: 'answered' }, { type: 'resume', away: ['nova', 'mira'] }],
      interrupted()
    )
    expect(state).toMatchObject({ status: 'ended', endReason: 'empty' })
  })

  it('can be interrupted again during the calm beat', () => {
    const calm = run([{ type: 'answered' }], interrupted())
    expect(run([studentMessage], calm)).toMatchObject({
      status: 'answering',
      floor: 'rex',
    })
  })

  it('goes round again and again: interruptions never use anything up', () => {
    let state = started()
    for (let i = 0; i < 20; i++) {
      state = run(
        [finish, studentMessage, { type: 'answered' }, { type: 'resume' }],
        state
      )
      expect(state.status).toBe('running')
    }
    expect(state.turn).toBe(20)
  })

  it('ignores an answer or a resume nobody asked for', () => {
    expect(run([{ type: 'answered' }, { type: 'resume' }], started())).toEqual(
      started()
    )
  })
})

describe('what ends an argument for good', () => {
  const stop: ArgumentAction = { type: 'stop' }
  const studentMessage: ArgumentAction = { type: 'studentMessage' }
  const failed: ArgumentAction = { type: 'turnFailed', error: 'boom' }

  it('"Stop it!" ends it in the middle of a turn', () => {
    expect(run([finish, stop], started())).toMatchObject({
      status: 'ended',
      endReason: 'button',
    })
  })

  it('"Stop it!" ends it while the student is being answered', () => {
    expect(run([studentMessage, stop], started())).toMatchObject({
      status: 'ended',
      endReason: 'button',
      speaker: null,
    })
  })

  it('"Stop it!" ends it during the calm beat, and it does not resume afterwards', () => {
    const stopped = run([studentMessage, { type: 'answered' }, stop], started())
    expect(stopped).toMatchObject({ status: 'ended', endReason: 'button' })
    expect(run([{ type: 'resume' }, finish], stopped)).toEqual(stopped)
  })

  it('"Stop it!" wins over a student message that comes after it', () => {
    const stopped = run([stop], started())
    expect(run([studentMessage, { type: 'answered' }], stopped)).toEqual(
      stopped
    )
  })

  it('a failing turn ends it, in any phase', () => {
    for (const before of [
      [],
      [studentMessage],
      [studentMessage, { type: 'answered' } as ArgumentAction],
    ]) {
      expect(run([...before, failed], started())).toMatchObject({
        status: 'ended',
        endReason: 'error',
        error: 'boom',
      })
    }
  })

  it('a student message never gives "ended" a second life', () => {
    const ended = run([stop], started())
    expect(
      run([studentMessage, { type: 'answered' }, { type: 'resume' }], ended)
    ).toEqual(ended)
  })
})
