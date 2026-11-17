import type { ThreadItem } from './messages'

export type ToolCallRow = {
  id: string
  name: string
  argsJson: string
  /** Undefined while the tool is still running. */
  resultContent?: string
}

export type Row =
  | { kind: 'student'; id: string; text: string }
  | { kind: 'tools'; id: string; speaker: string; calls: ToolCallRow[] }
  | {
      kind: 'say'
      id: string
      speaker: string
      text: string
      isSpeaking: boolean
    }
  | { kind: 'waiting'; id: 'waiting'; speaker: string }

const textOf = (content: unknown) =>
  typeof content === 'string' ? content : ''

/**
 * Turns the shared thread into what the screen shows, in order: the student's
 * messages, each character's tool calls (consecutive ones grouped) and spoken
 * balloons. `liveSpeaker` is who is running right now, if anyone.
 */
export const buildRows = (
  items: readonly ThreadItem[],
  liveSpeaker: string | null
): Row[] => {
  const results = new Map(
    items.flatMap(({ message }) =>
      message.role === 'tool'
        ? [[message.toolCallId, textOf(message.content)] as const]
        : []
    )
  )
  const rows: Row[] = []

  items.forEach(({ message, speaker }, index) => {
    if (message.role === 'user') {
      const text = textOf(message.content)
      if (text) rows.push({ kind: 'student', id: message.id, text })
      return
    }
    if (message.role !== 'assistant' || speaker === undefined) return

    const text = textOf(message.content).trim()
    if (text) {
      rows.push({
        kind: 'say',
        id: message.id,
        speaker,
        text,
        isSpeaking: liveSpeaker === speaker && index === items.length - 1,
      })
    }
    const calls = (message.toolCalls ?? []).map(call => ({
      id: call.id,
      name: call.function.name,
      argsJson: call.function.arguments,
      resultContent: results.get(call.id),
    }))
    if (calls.length === 0) return
    const previous = rows[rows.length - 1]
    if (previous?.kind === 'tools' && previous.speaker === speaker) {
      previous.calls.push(...calls)
    } else {
      rows.push({ kind: 'tools', id: `${message.id}-tools`, speaker, calls })
    }
  })

  const last = rows[rows.length - 1]
  const isSpeakingNow = last?.kind === 'say' && last.isSpeaking
  if (liveSpeaker !== null && !isSpeakingNow) {
    rows.push({ kind: 'waiting', id: 'waiting', speaker: liveSpeaker })
  }
  return rows
}

/** The rows for the settled thread plus the run that is going on right now. */
export const buildThreadRows = (
  thread: readonly ThreadItem[],
  live: { speaker: string; messages: ThreadItem['message'][] } | null
): Row[] =>
  buildRows(
    [
      ...thread,
      ...(live?.messages.map(message => ({ message, speaker: live.speaker })) ??
        []),
    ],
    live?.speaker ?? null
  )
