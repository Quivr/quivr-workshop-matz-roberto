import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCharacter } from '../../characters/registry'
import {
  argumentReducer,
  initialState,
  MAX_TURNS,
  type ArgumentAction,
  type ArgumentState,
} from '../argument/turns'
import { createBreakController } from '../chill/breakController'
import {
  ANSWERER_ID,
  awayFor,
  castStatus,
  PARTY_CAST,
  partyClips,
} from './cast'

const fresh = () => initialState(PARTY_CAST)

describe('the party cast', () => {
  it('is three bar characters who all have a break clip, and Pip is not one of them', () => {
    expect(PARTY_CAST).toHaveLength(3)
    for (const id of PARTY_CAST) {
      expect(getCharacter(id)?.animations.break, id).toBeTruthy()
    }
    expect(PARTY_CAST).not.toContain('pip')
    expect(PARTY_CAST).toContain(ANSWERER_ID)
  })

  it('has only Gus away while the break lasts', () => {
    expect(awayFor('chatting')).toEqual([])
    expect(awayFor('break')).toEqual([ANSWERER_ID])
  })
})

describe('the clips on the stage', () => {
  const running = argumentReducer(fresh(), { type: 'start', topic: 'x' })

  it('leaves the stage alone before anyone speaks', () => {
    expect(partyClips(fresh(), null)).toEqual({
      gus: undefined,
      bram: undefined,
      stien: undefined,
    })
    expect(partyClips(fresh(), 'bram').bram).toBe('talking')
  })

  it('has the one with the floor fight and the others argue', () => {
    expect(partyClips(running, null)).toEqual({
      gus: 'fight',
      bram: 'argue',
      stien: 'argue',
    })
  })

  it('calms everybody down once it is over', () => {
    const ended = argumentReducer(running, { type: 'studentMessage' })
    expect(Object.values(partyClips(ended, null))).toEqual([
      'calm',
      'calm',
      'calm',
    ])
  })
})

describe('castStatus', () => {
  const running = argumentReducer(fresh(), { type: 'start', topic: 'x' })

  it('says in words who is away, who has the floor and who is not', () => {
    expect(castStatus(running, 'gus', [])).toBe('has the floor')
    expect(castStatus(running, 'bram', [])).toBe('arguing')
    expect(castStatus(running, 'gus', ['gus'])).toBe('on a break')
    expect(castStatus(fresh(), 'bram', [])).toBe('ready')
    expect(
      castStatus(argumentReducer(running, { type: 'stop' }), 'bram', [])
    ).toBe('calm')
  })
})

/**
 * The coordination the screen relies on: the break controller decides who is
 * away, the reducer's turn order copes with it. This drives both the way
 * useParty does, without React or the network.
 */
describe('a break during an argument', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const BREAK_MS = 10_000
  const setup = () => {
    const controller = createBreakController({
      every: 1,
      durationMs: BREAK_MS,
    })
    controller.activate()
    let state: ArgumentState = fresh()
    const away = () => awayFor(controller.getSnapshot().phase)
    const dispatch = (action: ArgumentAction) => {
      state = argumentReducer(state, action)
    }
    const finishTurn = () => dispatch({ type: 'turnFinished', away: away() })
    return { controller, away, dispatch, finishTurn, get: () => state }
  }

  it('drops Gus from the turn order and takes him back when the break ends', async () => {
    const { controller, away, dispatch, finishTurn, get } = setup()
    dispatch({ type: 'start', topic: 'x', away: away() })
    const spoken = [get().speaker]

    finishTurn()
    spoken.push(get().speaker) // bram
    // The student's message made a break due; Gus's answer is done: he leaves.
    controller.route('hi', { ask: () => Promise.resolve(), sleepy: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.getSnapshot().phase).toBe('break')

    for (let i = 0; i < 3; i++) {
      finishTurn()
      spoken.push(get().speaker)
    }
    expect(spoken).toEqual(['gus', 'bram', 'stien', 'bram', 'stien'])

    await vi.advanceTimersByTimeAsync(BREAK_MS)
    expect(controller.getSnapshot().phase).toBe('chatting')
    finishTurn()
    expect(get().speaker).toBe('gus')
  })

  it('does not deadlock or skip the cap with Gus away the whole time', async () => {
    const { controller, away, dispatch, finishTurn, get } = setup()
    controller.route('hi', { ask: () => Promise.resolve(), sleepy: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)
    dispatch({ type: 'start', topic: 'x', away: away() })
    expect(get().speaker).toBe('bram')

    let finished = 0
    while (get().status === 'running') {
      finishTurn()
      finished += 1
      expect(finished).toBeLessThanOrEqual(MAX_TURNS)
    }
    expect(get()).toMatchObject({
      status: 'ended',
      endReason: 'limit',
      turn: MAX_TURNS,
    })
  })

  it('still lets the student calm or stop it with Gus away', async () => {
    const { controller, away, dispatch, get } = setup()
    controller.route('hi', { ask: () => Promise.resolve(), sleepy: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)
    dispatch({ type: 'start', topic: 'x', away: away() })
    dispatch({ type: 'studentMessage' })
    expect(get()).toMatchObject({ status: 'ended', endReason: 'student' })
  })

  it('counts a student message sent during the break as no message, and sends it to the sleepy branch', async () => {
    const { controller } = setup()
    const ask = vi.fn(() => Promise.resolve())
    const sleepy = vi.fn()
    controller.route('one', { ask, sleepy })
    await vi.advanceTimersByTimeAsync(0)
    controller.route('two', { ask, sleepy })
    expect(sleepy).toHaveBeenCalledWith('two')
    expect(ask).toHaveBeenCalledTimes(1)
  })
})
