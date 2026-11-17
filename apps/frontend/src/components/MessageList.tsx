import type { Message } from '@ag-ui/core'
import { useState } from 'react'

import { ToolCard } from '../cards/ToolCard'
import { Markdown } from './Markdown'

type Props = {
  messages: Message[]
  durations: Record<string, number>
  isRunning: boolean
  onAction?: (text: string) => void
  onCompose?: (text: string) => void
  actionsDisabled?: boolean
}

const textOf = (content: unknown) =>
  typeof content === 'string' ? content : ''

// Markdown punctuation is noise when read out, so strip it from the summary.
const toSpeech = (markdown: string) =>
  markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/[*`#>|~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** The assistant's spoken-friendly reply to the latest question, if any. */
const latestReply = (messages: Message[]) => {
  const lastUser = messages.findLastIndex(message => message.role === 'user')
  const reply = messages
    .slice(lastUser + 1)
    .findLast(message => message.role === 'assistant' && message.content)
  return reply ? toSpeech(textOf(reply.content)) : ''
}

export function MessageList({
  messages,
  durations,
  isRunning,
  onAction,
  onCompose,
  actionsDisabled,
}: Props) {
  // One screen-reader announcement per run: "thinking" at the start and the
  // finished reply at the end. The streaming text itself is not a live region,
  // so assistive tech is not interrupted on every token.
  const [wasRunning, setWasRunning] = useState(isRunning)
  const [announcement, setAnnouncement] = useState('')
  if (wasRunning !== isRunning) {
    setWasRunning(isRunning)
    if (isRunning) setAnnouncement('Quivr is thinking.')
    else if (messages.length === 0) setAnnouncement('')
    else setAnnouncement(latestReply(messages) || 'Quivr has finished.')
  }

  const toolResults = new Map(
    messages.flatMap(message =>
      message.role === 'tool'
        ? [[message.toolCallId, textOf(message.content)] as const]
        : []
    )
  )

  return (
    <div className="space-y-3">
      <div
        role="status"
        className="sr-only"
      >
        {announcement}
      </div>
      {messages.map(message => {
        if (message.role === 'user') {
          return (
            <div
              key={message.id}
              className="bg-main text-sidenav-blue motion-safe:animate-fade-up ml-auto max-w-[80%] rounded-lg px-3 py-2 whitespace-pre-wrap"
            >
              <span className="sr-only">You: </span>
              {textOf(message.content)}
            </div>
          )
        }
        if (message.role !== 'assistant') return null

        return (
          <div
            key={message.id}
            className="max-w-[90%] space-y-2"
          >
            {message.toolCalls?.map(call => (
              <ToolCard
                key={call.id}
                toolName={call.function.name}
                argsJson={call.function.arguments}
                resultContent={toolResults.get(call.id)}
                durationMs={durations[call.id]}
                onAction={onAction}
                onCompose={onCompose}
                actionsDisabled={actionsDisabled}
              />
            ))}
            {message.content && (
              <div className="motion-safe:animate-fade-up bg-surface rounded-lg px-3 py-2 shadow-sm">
                <span className="sr-only">Quivr: </span>
                <Markdown>{message.content}</Markdown>
              </div>
            )}
          </div>
        )
      })}
      {isRunning && (
        <div
          className="motion-safe:animate-fade-up flex items-center gap-1 text-sm"
          aria-hidden
        >
          Thinking
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              aria-hidden
              className="bg-muted motion-safe:animate-dot size-1.5 rounded-full"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
