import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBreakController } from './breakController'

const BREAK = 10_000

const setup = (every = 5) => {
  const controller = createBreakController({ every, durationMs: BREAK })
  const stop = controller.activate()
  const ask = vi.fn(() => Promise.resolve())
  const sleepy = vi.fn()
  const send = async (text = 'hi') => {
    controller.route(text, { ask, sleepy })
    await vi.advanceTimersByTimeAsync(0)
  }
  return { controller, stop, ask, sleepy, send }
}

describe('break controller', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts a break after the 5th answered message and counts down', async () => {
    const { controller, send } = setup()
    for (let i = 0; i < 4; i++) await send()
    expect(controller.getSnapshot().phase).toBe('chatting')
    await send()
    expect(controller.getSnapshot()).toEqual({
      phase: 'break',
      remainingMs: BREAK,
      elapsedMs: 0,
    })
    await vi.advanceTimersByTimeAsync(3000)
    expect(controller.getSnapshot().remainingMs).toBe(BREAK - 3000)
    expect(controller.getSnapshot().elapsedMs).toBe(3000)
  })

  it('ends the break on time and goes back to normal', async () => {
    const { controller, send, ask } = setup()
    const events: string[] = []
    controller.onEvent(event => events.push(event))
    for (let i = 0; i < 5; i++) await send()
    await vi.advanceTimersByTimeAsync(BREAK - 1)
    expect(controller.getSnapshot().phase).toBe('break')
    await vi.advanceTimersByTimeAsync(1)
    expect(controller.getSnapshot()).toEqual({
      phase: 'chatting',
      remainingMs: 0,
      elapsedMs: 0,
    })
    expect(events).toEqual(['break-start', 'break-end'])
    await send('after')
    expect(ask).toHaveBeenLastCalledWith('after')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('answers with the scripted reply and makes no agent call during a break', async () => {
    const { send, ask, sleepy } = setup()
    for (let i = 0; i < 5; i++) await send()
    expect(ask).toHaveBeenCalledTimes(5)
    await send('what is on the menu?')
    await send('hello?')
    expect(sleepy).toHaveBeenCalledTimes(2)
    expect(sleepy).toHaveBeenCalledWith('what is on the menu?')
    expect(ask).toHaveBeenCalledTimes(5)
  })

  it('uses the configured break length', async () => {
    const controller = createBreakController({ every: 1, durationMs: 2500 })
    controller.activate()
    controller.route('hi', { ask: () => Promise.resolve(), sleepy: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.getSnapshot().remainingMs).toBe(2500)
  })

  it('leaves no timer behind once stopped', async () => {
    const { controller, stop, send } = setup(1)
    await send()
    expect(controller.getSnapshot().phase).toBe('break')
    expect(vi.getTimerCount()).toBe(2)
    stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not start a break when a run settles after stop', async () => {
    const controller = createBreakController({ every: 1, durationMs: BREAK })
    const stop = controller.activate()
    let finish = () => {}
    controller.route('hi', {
      ask: () => new Promise<void>(resolve => (finish = resolve)),
      sleepy: vi.fn(),
    })
    stop()
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.getSnapshot().phase).toBe('chatting')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores a run that settles after a new chat', async () => {
    const controller = createBreakController({ every: 1, durationMs: BREAK })
    controller.activate()
    let finish = () => {}
    controller.route('hi', {
      ask: () => new Promise<void>(resolve => (finish = resolve)),
      sleepy: vi.fn(),
    })
    controller.reset()
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.getSnapshot().phase).toBe('chatting')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('also starts the break when the run fails', async () => {
    const controller = createBreakController({ every: 1, durationMs: BREAK })
    controller.activate()
    controller.route('hi', {
      ask: () => Promise.reject(new Error('boom')),
      sleepy: vi.fn(),
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.getSnapshot().phase).toBe('break')
  })
})
