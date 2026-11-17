import type { Message } from '@ag-ui/core'

import { ToolCard } from '../../cards/ToolCard'
import { CharacterAvatar } from '../../characters/CharacterAvatar'
import { Markdown } from '../../components/Markdown'
import { RESPONDER_ID, SLEEPY_ID_PREFIX } from './script'
import { SpeechBalloon } from './SpeechBalloon'

type Props = {
  messages: Message[]
  durations: Record<string, number>
  isRunning: boolean
}

const textOf = (content: unknown) =>
  typeof content === 'string' ? content : ''

const AVATAR_SIZE = 40

/** Gus's lines (agent answers and scripted ones) in balloons; tool cards stay cards. */
export function ChillMessages({ messages, durations, isRunning }: Props) {
  const toolResults = new Map(
    messages.flatMap(message =>
      message.role === 'tool'
        ? [[message.toolCallId, textOf(message.content)] as const]
        : []
    )
  )
  const last = messages.at(-1)
  const isWaiting =
    isRunning &&
    !(last?.role === 'assistant' && textOf(last.content).length > 0)

  return (
    <div className="space-y-3">
      {messages.map((message, index) => {
        if (message.role === 'user') {
          return (
            <div
              key={message.id}
              className="bg-main text-sidenav-blue motion-safe:animate-fade-up ml-auto max-w-[80%] rounded-lg px-3 py-2 whitespace-pre-wrap"
            >
              {textOf(message.content)}
            </div>
          )
        }
        if (message.role !== 'assistant') return null
        const text = textOf(message.content)
        const isStreaming = isRunning && index === messages.length - 1

        return (
          <div
            key={message.id}
            className="space-y-2"
          >
            {message.toolCalls?.map(call => (
              <div
                key={call.id}
                className="max-w-[90%]"
              >
                <ToolCard
                  toolName={call.function.name}
                  argsJson={call.function.arguments}
                  resultContent={toolResults.get(call.id)}
                  durationMs={durations[call.id]}
                />
              </div>
            ))}
            {text && (
              <div className="flex items-start gap-2">
                <CharacterAvatar
                  characterId={RESPONDER_ID}
                  clip={
                    message.id.startsWith(SLEEPY_ID_PREFIX)
                      ? 'break'
                      : isStreaming
                        ? 'talking'
                        : 'idle'
                  }
                  size={AVATAR_SIZE}
                  className="mt-1"
                />
                <SpeechBalloon
                  isSpeaking={isStreaming}
                  className="ml-1.5 max-w-[85%] sm:max-w-lg"
                >
                  <Markdown>{text}</Markdown>
                </SpeechBalloon>
              </div>
            )}
          </div>
        )
      })}
      {isWaiting && (
        <div
          className="flex items-start gap-2"
          role="status"
        >
          <CharacterAvatar
            characterId={RESPONDER_ID}
            clip="talking"
            size={AVATAR_SIZE}
            className="mt-1"
          />
          <span className="sr-only">Gus is thinking</span>
          <SpeechBalloon
            isSpeaking
            className="ml-1.5"
          >
            {null}
          </SpeechBalloon>
        </div>
      )}
    </div>
  )
}
