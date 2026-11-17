import type { Message, UserMessage } from '@ag-ui/core'

import { MAX_TURNS } from './turns'

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
      "Is the student's schedule tomorrow a good one or a nightmare? Look at their real schedule.",
  },
  {
    id: 'classmates',
    label: 'Whose day is worse',
    question:
      "Whose day tomorrow is worse: the student's, or their friends'? Look at the student's schedule and at which friends have something scheduled at the same time.",
  },
]

/** No argument yet: the student is just talking to the characters. */
export const CHAT_TOPIC: Topic = {
  id: 'chat',
  label: 'Chat',
  question: '',
}

/** A message in the shared thread, and which character wrote it (none: the student). */
export type ThreadItem = { message: Message; speaker?: string }

const textOf = (content: unknown) =>
  typeof content === 'string' ? content : ''

const FACT_RULES = [
  'Every fact you state (restaurant, dish, library, class, friend, time, room, number) must come from a tool result in this conversation. Reuse the results above or call a read-only tool if you need more. Never invent facts.',
  'If the tools do not tell you something, say you do not know. You can be opinionated, rude to the others and funny, but not about the facts.',
  'Quote at least one concrete detail from a tool result.',
  '2 to 4 short sentences, no lists, in character. Do not start with your own name or with square brackets.',
]

/** The first message of every run: it also guarantees the history starts with a user message. */
export const kickoffMessage = (topic: Topic): UserMessage => ({
  id: 'kickoff',
  role: 'user',
  content:
    topic.id === CHAT_TOPIC.id
      ? 'The student is talking to some characters in a group chat. They may start an argument between the characters later.'
      : `The student wants three characters to argue about their own data while they watch. Topic: ${topic.question}`,
})

type InstructionInput = {
  turn: number
  speakerName: string
  otherNames: string[]
  previousSpeakerName?: string
}

/** The last message of an argument turn: who you are and what to do now. */
export const turnInstruction = ({
  turn,
  speakerName,
  otherNames,
  previousSpeakerName,
}: InstructionInput): UserMessage => ({
  id: `instruction-${turn + 1}`,
  role: 'user',
  content: [
    `ARGUMENT, turn ${turn + 1} of ${MAX_TURNS}. You are ${speakerName}, in a group chat with ${otherNames.join(' and ')}. Lines that start with a name in square brackets were said by the others, not by you.`,
    previousSpeakerName
      ? `${previousSpeakerName} spoke last: answer them directly, disagree and take a side.`
      : 'You speak first: take a side and start the fight.',
    ...FACT_RULES,
  ].join('\n'),
})

/** The last message when the student joined the thread and one character answers. */
export const replyInstruction = (speakerName: string): UserMessage => ({
  id: `reply-${crypto.randomUUID()}`,
  role: 'user',
  content: [
    `The student joined the group chat and wrote the last message that is not in square brackets. You are ${speakerName}: answer the student directly and briefly. Lines that start with a name in square brackets were said by the other characters.`,
    ...FACT_RULES,
  ].join('\n'),
})

/**
 * What one character sees of the shared thread: its own messages as they were,
 * the others' lines as labelled user messages (so it does not mistake them for
 * its own), and everyone's tool calls and results, which are shared facts.
 */
export const forSpeaker = (
  thread: readonly ThreadItem[],
  speakerId: string,
  nameOf: (id: string) => string
): Message[] =>
  thread.flatMap(({ message, speaker }): Message[] => {
    if (message.role !== 'assistant') return [message]
    if (speaker === undefined || speaker === speakerId) return [message]
    // Text said next to a tool call is filler: keep the call, drop the words.
    if (message.toolCalls?.length) return [{ ...message, content: '' }]
    const text = textOf(message.content).trim()
    if (!text) return []
    return [
      {
        id: `${message.id}-says`,
        role: 'user',
        content: `[${nameOf(speaker)}, another character in this argument, not the student] ${text}`,
      },
    ]
  })

/** The messages for one run: topic, the thread as this speaker sees it, then the instruction. */
export const buildInput = (
  topic: Topic,
  thread: readonly ThreadItem[],
  speakerId: string,
  nameOf: (id: string) => string,
  instruction: UserMessage
): Message[] => [
  kickoffMessage(topic),
  ...forSpeaker(thread, speakerId, nameOf),
  instruction,
]

/** The last non-empty assistant text: the turn's spoken message. */
export const spokenText = (messages: readonly Message[]) => {
  for (let i = messages.length - 1; i >= 0; i--) {
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
