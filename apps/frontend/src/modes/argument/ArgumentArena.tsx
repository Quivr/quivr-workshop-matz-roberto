import { useState, type FormEvent } from 'react'

import { CharacterAvatar } from '../../characters/CharacterAvatar'
import { getCharacter } from '../../characters/registry'
import type { CharacterClip } from '../../characters/types'
import { ArgumentThread } from './ArgumentThread'
import { TOPICS } from './messages'
import { buildRows } from './rows'
import { MAX_TURNS, type ArgumentState, type EndReason } from './turns'
import { useArgument } from './useArgument'

type Props = {
  cast: readonly string[]
  model: string
  onNewArgument: () => void
}

const END_TEXT: Record<EndReason, string> = {
  limit: `${MAX_TURNS} turns done. They are waiting for you: type below.`,
  button: 'Stopped. Type below to ask one of them something.',
  student: 'You stepped in. The argument is over.',
  error: 'The argument broke off.',
}

const clipFor = (
  state: ArgumentState,
  id: string,
  isTalking: boolean
): CharacterClip => {
  if (state.status === 'idle') return 'idle'
  if (state.status === 'ended') return isTalking ? 'talking' : 'calm'
  return state.speaker === id ? 'fight' : 'argue'
}

const buttonClass =
  'bg-main text-sidenav-blue rounded-md px-4 py-1.5 font-bold hover:brightness-95 active:scale-95 motion-safe:transition'

export function ArgumentArena({ cast, model, onNewArgument }: Props) {
  const {
    state,
    thread,
    live,
    durations,
    error,
    isRunning,
    start,
    stop,
    sendStudent,
  } = useArgument(cast, model)
  const [text, setText] = useState('')
  const isArguing = state.status === 'running'
  const rows = buildRows(
    [
      ...thread,
      ...(live?.messages.map(message => ({ message, speaker: live.speaker })) ??
        []),
    ],
    live?.speaker ?? null
  )
  const isDisabled =
    state.status === 'idle' || (state.status === 'ended' && isRunning)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isDisabled) return
    void sendStudent(trimmed)
    setText('')
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
      <div className="border-schedule-border-grey space-y-3 border-b px-4 pt-3 pb-1">
        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          {state.status === 'idle' && (
            <>
              <span className="font-title text-heading text-2xl tracking-wide">
                What should they fight about?
              </span>
              {TOPICS.map(topic => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => void start(topic)}
                  className={buttonClass}
                >
                  {topic.label}
                </button>
              ))}
            </>
          )}
          {isArguing && (
            <>
              <span
                className="text-main-text text-sm"
                role="status"
              >
                Turn {state.turn + 1} of {MAX_TURNS} · {state.topic}
              </span>
              <button
                type="button"
                onClick={stop}
                className="border-danger text-danger bg-surface hover:bg-danger/10 rounded-md border-2 px-4 py-1.5 font-bold active:scale-95 motion-safe:transition"
              >
                Stop it!
              </button>
            </>
          )}
          {state.status === 'ended' && (
            <>
              <span
                className="text-main-text text-sm"
                role="status"
              >
                {END_TEXT[state.endReason ?? 'error']}
                {state.error ? ` ${state.error}` : ''}
              </span>
              <button
                type="button"
                onClick={onNewArgument}
                className={buttonClass}
              >
                New argument
              </button>
            </>
          )}
        </div>

        <div className="flex justify-center gap-6 sm:gap-12">
          {cast.map((id, index) => {
            const hasFloor = isArguing && state.speaker === id
            return (
              <div
                key={id}
                className="motion-safe:animate-fade-up flex flex-col items-center"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div
                  className={`motion-safe:transition-transform motion-safe:duration-300 ${
                    hasFloor
                      ? 'motion-safe:-translate-y-1.5 motion-safe:scale-110'
                      : ''
                  }`}
                >
                  <CharacterAvatar
                    characterId={id}
                    clip={clipFor(state, id, live?.speaker === id)}
                    size={88}
                  />
                </div>
                <span
                  className={`font-title rounded-full px-3 text-lg tracking-wide ${
                    hasFloor ? 'bg-main text-sidenav-blue' : 'text-heading'
                  }`}
                >
                  {getCharacter(id)?.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <ArgumentThread
        cast={cast}
        rows={rows}
        durations={durations}
        error={error}
      />

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 pt-0"
      >
        <input
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder={
            state.status === 'idle'
              ? 'Pick a topic first'
              : isArguing
                ? 'Step in to stop the argument…'
                : 'Ask them something…'
          }
          disabled={isDisabled}
          aria-label="Message the characters"
          className="border-schedule-border-grey focus:border-sidenav-blue dark:focus:border-main bg-surface min-w-0 flex-1 rounded-md border px-3 py-2 outline-none focus:shadow-sm disabled:opacity-50 motion-safe:transition-[border-color,box-shadow]"
        />
        <button
          type="submit"
          disabled={isDisabled}
          className="bg-main text-sidenav-blue rounded-md px-4 py-2 font-bold hover:brightness-95 active:scale-95 disabled:opacity-50 motion-safe:transition motion-safe:disabled:active:scale-100"
        >
          Send
        </button>
      </form>
    </div>
  )
}
