import type { Message, UserMessage } from '@ag-ui/core'

import { MAX_TURNS, type Heard } from './turns'

export type Topic = { id: string; label: string; question: string }

export const TOPICS: Topic[] = [
  {
    id: 'restaurant',
    label: 'Best restaurant',
    question:
      "Which student restaurant is the best place for the student's lunch today? Look at the restaurants and today's menus.",
  },
  {
    id: 'library',
    label: 'Best library',
    question:
      'Which library should the student go and work in right now? Look at how busy the libraries are.',
  },
  {
    id: 'schedule',
    label: 'My schedule',
    question:
      "Is the student's schedule today a good one or a nightmare? Look at their real schedule.",
  },
]

const HEARD_ID_PREFIX = 'heard-'
const PROMPT_ID_PREFIX = 'prompt-'

export const isPrompt = (message: Message) =>
  message.id.startsWith(PROMPT_ID_PREFIX)

const HEARD_PREFIX = /^\[[^\]]*\]\s*/

/** The text of a heard message without the "[Name, …]" label the model sees. */
export const heardText = (content: string) => content.replace(HEARD_PREFIX, '')

/** What another character said, as a history message. `name` carries the speaker's id. */
export const heardMessage = (
  heard: Heard,
  speakerName: string
): UserMessage => ({
  id: `${HEARD_ID_PREFIX}${heard.id}`,
  role: 'user',
  name: heard.from,
  content: `[${speakerName}, another character in this argument, not the student] ${heard.text}`,
})

type PromptInput = {
  topic: Topic
  turn: number
  speakerName: string
  otherNames: string[]
  isFirstTurnForSpeaker: boolean
  previousSpeakerName?: string
}

/** The instruction that opens a character's turn. Facts must come from tools. */
export const turnPrompt = ({
  topic,
  turn,
  speakerName,
  otherNames,
  isFirstTurnForSpeaker,
  previousSpeakerName,
}: PromptInput): Message => {
  const rules = [
    'Every fact you state (restaurant, dish, library, class, time, room, number) must come from a tool result you have seen in this chat. Never invent facts.',
    'If the tools do not tell you something, say you do not know. You can be opinionated, rude to the others and funny, but not about the facts.',
    'Quote at least one concrete detail from a tool result.',
    'Only call tools that read data. 2 to 4 short sentences, no lists, in character.',
  ]
  const lines = isFirstTurnForSpeaker
    ? [
        `ARGUMENT, turn ${turn + 1} of ${MAX_TURNS}. You are ${speakerName}, arguing with ${otherNames.join(' and ')} about the student's own data. The student is watching.`,
        `Topic: ${topic.question}`,
        previousSpeakerName
          ? `${previousSpeakerName} spoke before you. Look up the facts with your tools first, then take a side and answer them.`
          : 'You speak first. Look up the facts with your tools first, then take a side and start the fight.',
      ]
    : [
        `ARGUMENT, turn ${turn + 1} of ${MAX_TURNS}. Your turn, ${speakerName}. Answer what ${previousSpeakerName ?? 'the others'} just said: disagree and counter with a specific detail from a tool result. Call a tool again if you need another fact.`,
      ]
  return {
    id: `${PROMPT_ID_PREFIX}${turn + 1}`,
    role: 'user',
    content: [...lines, ...rules].join('\n'),
  }
}

const textOf = (content: unknown) =>
  typeof content === 'string' ? content : ''

/** The last non-empty assistant text after `fromIndex`: the turn's spoken message. */
export const spokenText = (messages: readonly Message[], fromIndex: number) => {
  for (let i = messages.length - 1; i >= fromIndex; i--) {
    const message = messages[i]!
    if (message.role !== 'assistant') continue
    const text = textOf(message.content).trim()
    if (text) return text
  }
  return ''
}

/**
 * After an aborted run, drops assistant messages whose tool calls never got a
 * result (and the orphaned results), which the model API would reject.
 */
export const dropIncomplete = (messages: readonly Message[]): Message[] => {
  const answered = new Set(
    messages.flatMap(m => (m.role === 'tool' ? [m.toolCallId] : []))
  )
  const dropped = new Set<string>()
  const kept = messages.filter(message => {
    if (message.role !== 'assistant' || !message.toolCalls?.length) return true
    const complete = message.toolCalls.every(call => answered.has(call.id))
    if (!complete) message.toolCalls.forEach(call => dropped.add(call.id))
    return complete
  })
  return kept.filter(m => m.role !== 'tool' || !dropped.has(m.toolCallId))
}
