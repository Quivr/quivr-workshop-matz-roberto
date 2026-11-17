import type { Message } from '@ag-ui/core'
import { describe, expect, it } from 'vitest'

import type { ThreadItem } from './messages'
import { buildRows } from './rows'

const say = (id: string, content: string, speaker: string): ThreadItem => ({
  message: { id, role: 'assistant', content },
  speaker,
})

const call = (id: string, callIds: string[], speaker: string): ThreadItem => ({
  message: {
    id,
    role: 'assistant',
    toolCalls: callIds.map(callId => ({
      id: callId,
      type: 'function' as const,
      function: { name: 'get_menu', arguments: '{"date":"2026-11-17"}' },
    })),
  } as Message,
  speaker,
})

const result = (toolCallId: string, speaker: string): ThreadItem => ({
  message: { id: `r-${toolCallId}`, role: 'tool', toolCallId, content: '{}' },
  speaker,
})

const student = (text: string): ThreadItem => ({
  message: { id: `u-${text}`, role: 'user', content: text },
})

describe('buildRows', () => {
  it('is empty for an empty thread', () => {
    expect(buildRows([], null)).toEqual([])
  })

  it('keeps the order of the thread: tools, balloon, the student, the next balloon', () => {
    const rows = buildRows(
      [
        call('a1', ['c1'], 'nova'),
        result('c1', 'nova'),
        say('a2', 'Alma wins.', 'nova'),
        student('Why?'),
        say('a3', 'Because.', 'rex'),
      ],
      null
    )
    expect(rows.map(r => r.kind)).toEqual(['tools', 'say', 'student', 'say'])
    expect(rows[1]).toMatchObject({ speaker: 'nova', text: 'Alma wins.' })
    expect(rows[3]).toMatchObject({ speaker: 'rex' })
  })

  it("groups one character's consecutive tool calls and attaches the results", () => {
    const rows = buildRows(
      [
        call('a1', ['c1', 'c2'], 'nova'),
        result('c1', 'nova'),
        call('a2', ['c3'], 'nova'),
        result('c3', 'nova'),
      ],
      null
    )
    expect(rows).toHaveLength(1)
    const [tools] = rows
    expect(tools).toMatchObject({ kind: 'tools', speaker: 'nova' })
    if (tools?.kind !== 'tools') throw new Error('expected tools')
    expect(tools.calls.map(c => [c.id, c.resultContent])).toEqual([
      ['c1', '{}'],
      ['c2', undefined],
      ['c3', '{}'],
    ])
  })

  it('does not group tool calls of different characters', () => {
    const rows = buildRows(
      [call('a1', ['c1'], 'nova'), call('a2', ['c2'], 'rex')],
      null
    )
    expect(rows.map(r => r.kind)).toEqual(['tools', 'tools'])
  })

  it('marks only the balloon that is still streaming as speaking', () => {
    const items = [say('a1', 'Old.', 'nova'), say('a2', 'New', 'rex')]
    const rows = buildRows(items, 'rex')
    expect(rows.map(r => r.kind === 'say' && r.isSpeaking)).toEqual([
      false,
      true,
    ])
    expect(rows.some(r => r.kind === 'waiting')).toBe(false)
  })

  it('shows the waiting dots while the speaker has not said anything yet', () => {
    const rows = buildRows([say('a1', 'Old.', 'nova')], 'rex')
    expect(rows.at(-1)).toEqual({
      kind: 'waiting',
      id: 'waiting',
      speaker: 'rex',
    })
    expect(rows[0]).toMatchObject({ isSpeaking: false })
  })

  it('shows the dots again after the tools, before the answer', () => {
    const rows = buildRows(
      [call('a1', ['c1'], 'rex'), result('c1', 'rex')],
      'rex'
    )
    expect(rows.map(r => r.kind)).toEqual(['tools', 'waiting'])
  })

  it('shows no dots when nobody is running', () => {
    expect(buildRows([say('a1', 'Hi.', 'nova')], null)).toHaveLength(1)
  })
})
