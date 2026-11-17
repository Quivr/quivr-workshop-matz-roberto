import type { Message } from '@ag-ui/core'
import { describe, expect, it } from 'vitest'

import {
  dropIncomplete,
  heardMessage,
  heardText,
  isPrompt,
  spokenText,
  TOPICS,
  turnPrompt,
} from './messages'

const topic = TOPICS[0]!

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

describe('heardMessage', () => {
  it('is a user message naming the speaker, and the text survives the label', () => {
    const message = heardMessage(
      { id: 'turn-2', from: 'rex', text: 'Alma 2 has soup.' },
      'Rex'
    )
    expect(message.role).toBe('user')
    expect(message.name).toBe('rex')
    expect(message.content).toContain('not the student')
    expect(heardText(message.content as string)).toBe('Alma 2 has soup.')
  })
})

describe('turnPrompt', () => {
  const base = {
    topic,
    speakerName: 'Nova',
    otherNames: ['Rex', 'Mira'],
  }

  it('demands tool facts and no invention, on every turn', () => {
    for (const isFirstTurnForSpeaker of [true, false]) {
      const message = turnPrompt({
        ...base,
        turn: 3,
        isFirstTurnForSpeaker,
        previousSpeakerName: 'Rex',
      })
      expect(isPrompt(message)).toBe(true)
      expect(message.content).toContain('must come from a tool result')
      expect(message.content).toContain('Never invent facts')
      expect(message.content).toContain('turn 4 of 8')
    }
  })

  it('opens the topic on a first turn only', () => {
    const first = turnPrompt({ ...base, turn: 0, isFirstTurnForSpeaker: true })
    const later = turnPrompt({ ...base, turn: 4, isFirstTurnForSpeaker: false })
    expect(first.content).toContain(topic.question)
    expect(first.content).toContain('You speak first')
    expect(later.content).not.toContain(topic.question)
  })
})

describe('spokenText', () => {
  it('takes the last assistant text after the turn started', () => {
    const messages = [
      assistant('a0', 'old turn'),
      assistant('a1', 'Let me look.', ['c1']),
      toolResult('c1'),
      assistant('a2', 'Alma 2 beats everyone.'),
    ]
    expect(spokenText(messages, 1)).toBe('Alma 2 beats everyone.')
  })

  it('is empty when nothing was said this turn', () => {
    expect(spokenText([assistant('a0', 'old turn')], 1)).toBe('')
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
