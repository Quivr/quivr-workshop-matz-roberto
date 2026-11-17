import type { Message } from '@ag-ui/core'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import { CharacterAvatar } from '../../characters/CharacterAvatar'
import { getCharacter } from '../../characters/registry'
import { Markdown } from '../../components/Markdown'
import { useStickToBottom } from '../../components/useStickToBottom'
import { CompactToolCall } from './CompactToolCall'
import { heardText, isPrompt } from './messages'
import { SpeechBalloon } from './SpeechBalloon'
import type { Chat } from './useArgument'

const textOf = (content: unknown) =>
  typeof content === 'string' ? content : ''

type Props = {
  characterId: string
  chat: Chat
  /** What the others said that this character has not been given yet. */
  pending: Message[]
  isSpeaking: boolean
  isDisabled: boolean
  placeholder: string
  onSend: (text: string) => void
}

/** The character's avatar next to a balloon whose tail points at it. */
function Speech({
  characterId,
  side = 'left',
  isSpeaking,
  children,
}: {
  characterId: string
  side?: 'left' | 'right'
  isSpeaking: boolean
  children?: ReactNode
}) {
  return (
    <div
      className={`flex items-start gap-2 ${side === 'right' ? 'flex-row-reverse' : ''}`}
    >
      <CharacterAvatar
        characterId={characterId}
        clip={isSpeaking ? 'talking' : 'idle'}
        size={40}
      />
      <SpeechBalloon
        side={side}
        isSpeaking={isSpeaking}
      >
        {children}
      </SpeechBalloon>
    </div>
  )
}

function Bubbles({
  characterId,
  chat,
  messages,
}: {
  characterId: string
  chat: Chat
  messages: Message[]
}) {
  const lastMessage = messages[messages.length - 1]
  // Running, but nothing is being said yet (looking things up): show the dots.
  const isWaiting =
    chat.isRunning &&
    !(lastMessage?.role === 'assistant' && lastMessage.content)

  const toolResults = new Map(
    messages.flatMap(message =>
      message.role === 'tool'
        ? [[message.toolCallId, textOf(message.content)] as const]
        : []
    )
  )

  return (
    <div className="space-y-3">
      {messages.map(message => {
        if (message.role === 'user') {
          if (isPrompt(message)) return null
          const from = getCharacter(message.name)
          if (!from) {
            return (
              <div
                key={message.id}
                className="bg-main text-sidenav-blue motion-safe:animate-fade-up ml-auto max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
              >
                {textOf(message.content)}
              </div>
            )
          }
          return (
            <Speech
              key={message.id}
              characterId={from.id}
              side="right"
              isSpeaking={false}
            >
              {heardText(textOf(message.content))}
            </Speech>
          )
        }
        if (message.role !== 'assistant') return null

        return (
          <div
            key={message.id}
            className="space-y-2"
          >
            {message.toolCalls?.map(call => (
              <CompactToolCall
                key={call.id}
                toolName={call.function.name}
                argsJson={call.function.arguments}
                resultContent={toolResults.get(call.id)}
                durationMs={chat.durations[call.id]}
              />
            ))}
            {message.content && (
              <Speech
                characterId={characterId}
                isSpeaking={chat.isRunning && message.id === lastMessage?.id}
              >
                <Markdown>{message.content}</Markdown>
              </Speech>
            )}
          </div>
        )
      })}
      {isWaiting && (
        <Speech
          characterId={characterId}
          isSpeaking
        />
      )}
    </div>
  )
}

/** One character's chat window. Owns its own scroll container. */
export function ArgumentColumn({
  characterId,
  chat,
  pending,
  isSpeaking,
  isDisabled,
  placeholder,
  onSend,
}: Props) {
  const character = getCharacter(characterId)
  const { scrollRef, contentRef, scrollToBottom } = useStickToBottom()
  const [text, setText] = useState('')
  const entries = [...chat.messages, ...pending]

  // Left alone when the student has scrolled up to read.
  const isAwayRef = useRef(false)
  const noteUserScroll = (element: HTMLElement) =>
    requestAnimationFrame(() => {
      isAwayRef.current =
        element.scrollHeight - element.scrollTop - element.clientHeight > 48
    })
  // The hook follows streaming text; big jumps (a new balloon, a tool chip) can
  // slip past it, so every new entry pins the column to the bottom again.
  useEffect(() => {
    if (!isAwayRef.current) scrollToBottom()
  }, [entries.length, chat.isRunning, scrollToBottom])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isDisabled) return
    onSend(trimmed)
    setText('')
  }

  return (
    <section
      aria-label={`${character?.name ?? characterId}'s chat`}
      className={`bg-cardbg/40 flex h-96 min-h-0 flex-col overflow-hidden rounded-lg border-2 md:h-auto ${
        isSpeaking ? 'border-main' : 'border-transparent'
      } motion-safe:transition-colors`}
    >
      <h2 className="font-title text-heading flex items-center gap-2 px-3 pt-2 text-xl tracking-wide">
        <span
          aria-hidden
          className={`ring-main-text/40 size-2.5 rounded-full ring-1 ${character?.colorClass ?? ''}`}
        />
        {character?.name ?? characterId}
      </h2>
      <div
        ref={scrollRef}
        onWheel={event => noteUserScroll(event.currentTarget)}
        onTouchMove={event => noteUserScroll(event.currentTarget)}
        onScroll={event => {
          const element = event.currentTarget
          if (
            element.scrollHeight - element.scrollTop - element.clientHeight <=
            48
          )
            isAwayRef.current = false
        }}
        className="min-h-0 flex-1 overflow-y-auto p-3"
      >
        <div ref={contentRef}>
          <Bubbles
            characterId={characterId}
            chat={chat}
            messages={entries}
          />
          {chat.error && (
            <p className="bg-danger/10 text-danger mt-3 rounded-md px-3 py-2 text-sm">
              {chat.error}
            </p>
          )}
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-3 pt-0"
      >
        <input
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          aria-label={`Message ${character?.name ?? characterId}`}
          className="border-schedule-border-grey focus:border-sidenav-blue dark:focus:border-main bg-surface min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isDisabled}
          className="bg-main text-sidenav-blue rounded-md px-3 py-1.5 text-sm font-bold hover:brightness-95 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  )
}
