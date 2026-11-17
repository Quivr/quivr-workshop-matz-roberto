import type { Message } from '@ag-ui/core'
import { describe, expect, it } from 'vitest'

import { createRunTracker, dropOrphanToolCalls } from './chatRun'

describe('createRunTracker', () => {
  it('keeps a run current until something cancels it, so leaving the screen is harmless', () => {
    const runs = createRunTracker()
    const run = runs.start()
    expect(runs.isRunning()).toBe(true)
    expect(run.isCurrent()).toBe(true)
    expect(run.finish()).toBe(true)
    expect(runs.isRunning()).toBe(false)
  })

  it('cancel stales the run: its callbacks and its finish are ignored', () => {
    const runs = createRunTracker()
    const run = runs.start()
    expect(runs.cancel()).toBe(true)
    expect(run.isCurrent()).toBe(false)
    expect(runs.isRunning()).toBe(false)
    expect(run.finish()).toBe(false)
  })

  it('cancel is a no-op when idle', () => {
    const runs = createRunTracker()
    expect(runs.cancel()).toBe(false)
    const run = runs.start()
    run.finish()
    expect(runs.cancel()).toBe(false)
  })

  it('a stale run cannot stop the run that replaced it', () => {
    const runs = createRunTracker()
    const first = runs.start()
    runs.cancel()
    const second = runs.start()
    expect(first.finish()).toBe(false)
    expect(runs.isRunning()).toBe(true)
    expect(second.isCurrent()).toBe(true)
    expect(second.finish()).toBe(true)
  })

  it('invalidate disowns a run (new chat) and works when idle', () => {
    const runs = createRunTracker()
    const run = runs.start()
    runs.invalidate()
    expect(run.isCurrent()).toBe(false)
    expect(runs.isRunning()).toBe(false)
    expect(() => runs.invalidate()).not.toThrow()
  })
})

const user = (id: string): Message => ({ id, role: 'user', content: 'q' })
const call = (id: string) => ({
  id,
  type: 'function' as const,
  function: { name: 'tool', arguments: '{}' },
})

describe('dropOrphanToolCalls', () => {
  it('keeps a plain thread untouched', () => {
    const messages = [
      user('u1'),
      { id: 'a1', role: 'assistant', content: 'hi' } as Message,
    ]
    expect(dropOrphanToolCalls(messages)).toEqual(messages)
  })

  it('keeps tool calls that have a result', () => {
    const messages: Message[] = [
      user('u1'),
      { id: 'a1', role: 'assistant', toolCalls: [call('t1')] },
      { id: 'r1', role: 'tool', toolCallId: 't1', content: '{}' },
    ]
    expect(dropOrphanToolCalls(messages)).toEqual(messages)
  })

  it('drops an empty assistant message whose calls never got a result', () => {
    const messages: Message[] = [
      user('u1'),
      { id: 'a1', role: 'assistant', toolCalls: [call('t1')] },
    ]
    expect(dropOrphanToolCalls(messages)).toEqual([user('u1')])
  })

  it('keeps the text and only the answered calls of a half-finished message', () => {
    const messages: Message[] = [
      user('u1'),
      {
        id: 'a1',
        role: 'assistant',
        content: 'Looking…',
        toolCalls: [call('t1'), call('t2')],
      },
      { id: 'r1', role: 'tool', toolCallId: 't1', content: '{}' },
    ]
    const kept = dropOrphanToolCalls(messages)
    expect(kept).toHaveLength(3)
    expect(kept[1]).toMatchObject({
      content: 'Looking…',
      toolCalls: [{ id: 't1' }],
    })
  })
})
