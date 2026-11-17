import type { Message } from '@ag-ui/core'
import { describe, expect, it } from 'vitest'

import {
  buildInput,
  dropIncomplete,
  forSpeaker,
  replyInstruction,
  spokenText,
  TOPICS,
  turnInstruction,
  type ThreadItem,
} from './messages'

const topic = TOPICS[0]!
const nameOf = (id: string) => id.toUpperCase()

const assistant = (
  id: string,
  content: string,
  toolCallIds: string[] = []
): Message => ({
  id,
  role: 'assistant',
  content,
  toolCalls: toolCallIds.map(callId => ({
    id: callId,
    type: 'function' as const,
    function: { name: 'get_menu', arguments: '{}' },
  })),
})

const toolResult = (toolCallId: string): Message => ({
  id: `result-${toolCallId}`,
  role: 'tool',
  toolCallId,
  content: '{}',
})

describe('turnInstruction', () => {
  const base = { speakerName: 'Nova', otherNames: ['Rex', 'Mira'] }

  it('demands tool facts and no invention, on every turn', () => {
    for (const previousSpeakerName of [undefined, 'Rex']) {
      const { content } = turnInstruction({
        ...base,
        turn: 3,
        previousSpeakerName,
      })
      expect(content).toContain('must come from a tool result')
      expect(content).toContain('Never invent facts')
      expect(content).toContain('turn 4 of 8')
    }
  })

  it('answers the previous speaker, or opens the fight', () => {
    const first = turnInstruction({ ...base, turn: 0 })
    const later = turnInstruction({
      ...base,
      turn: 1,
      previousSpeakerName: 'Rex',
    })
    expect(first.content).toContain('You speak first')
    expect(later.content).toContain('Rex spoke last')
  })
})

describe('replyInstruction', () => {
  it('keeps the fact rules and addresses the student', () => {
    const { content } = replyInstruction('Nova')
    expect(content).toContain('answer the student')
    expect(content).toContain('Never invent facts')
  })
})

describe('forSpeaker', () => {
  const thread: ThreadItem[] = [
    { message: assistant('a1', 'Looking.', ['c1']), speaker: 'nova' },
    { message: toolResult('c1'), speaker: 'nova' },
    { message: assistant('a2', 'Alma 2 wins.'), speaker: 'nova' },
    { message: assistant('a3', 'Alma 1 wins.'), speaker: 'rex' },
    { message: { id: 'u1', role: 'user', content: 'Why?' } },
  ]

  it("keeps the speaker's own messages and labels the others' lines as user messages", () => {
    const seen = forSpeaker(thread, 'rex', nameOf)
    expect(seen.map(m => m.role)).toEqual([
      'assistant',
      'tool',
      'user',
      'assistant',
      'user',
    ])
    expect(seen[2]).toMatchObject({
      role: 'user',
      content: expect.stringContaining('[NOVA, another character'),
    })
    expect(seen[2]!.content).toContain('Alma 2 wins.')
    expect(seen[3]).toBe(thread[3]!.message)
  })

  it("keeps everybody's tool calls and results but drops the others' filler text", () => {
    const [call, result] = forSpeaker(thread, 'rex', nameOf)
    expect(call).toMatchObject({ role: 'assistant', content: '' })
    expect((call as { toolCalls: unknown[] }).toolCalls).toHaveLength(1)
    expect(result).toBe(thread[1]!.message)
  })

  it('passes the student through unlabelled', () => {
    expect(forSpeaker(thread, 'nova', nameOf).at(-1)).toBe(thread[4]!.message)
  })

  it("does not mistake the speaker's own words for another character's", () => {
    const seen = forSpeaker(thread, 'nova', nameOf)
    expect(seen[0]).toBe(thread[0]!.message)
    expect(seen[2]).toBe(thread[2]!.message)
  })
})

describe('buildInput', () => {
  it('starts with the topic as a user message and ends with the instruction', () => {
    const instruction = replyInstruction('Nova')
    const input = buildInput(
      topic,
      [{ message: assistant('a1', 'Hi.'), speaker: 'rex' }],
      'nova',
      nameOf,
      instruction
    )
    expect(input[0]).toMatchObject({ role: 'user' })
    expect(input[0]!.content).toContain(topic.question)
    expect(input.at(-1)).toBe(instruction)
  })

  it('on the first turn is just the topic and the instruction', () => {
    expect(
      buildInput(topic, [], 'nova', nameOf, replyInstruction('Nova'))
    ).toHaveLength(2)
  })
})

describe('spokenText', () => {
  it('takes the last assistant text', () => {
    expect(
      spokenText([
        assistant('a1', 'Let me look.', ['c1']),
        toolResult('c1'),
        assistant('a2', 'Alma 2 beats everyone.'),
      ])
    ).toBe('Alma 2 beats everyone.')
  })

  it('is empty when nothing was said', () => {
    expect(spokenText([assistant('a1', '', ['c1']), toolResult('c1')])).toBe('')
  })
})

describe('dropIncomplete', () => {
  it('keeps complete tool exchanges', () => {
    const messages = [assistant('a1', '', ['c1']), toolResult('c1')]
    expect(dropIncomplete(messages)).toEqual(messages)
  })

  it('drops a tool call that never got a result, and keeps the rest', () => {
    const messages = [
      assistant('a1', '', ['c1']),
      toolResult('c1'),
      assistant('a2', '', ['c2', 'c3']),
      toolResult('c2'),
    ]
    expect(dropIncomplete(messages).map(m => m.id)).toEqual(['a1', 'result-c1'])
  })
})
