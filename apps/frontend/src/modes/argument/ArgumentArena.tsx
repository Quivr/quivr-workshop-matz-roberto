import { CharacterAvatar } from '../../characters/CharacterAvatar'
import { getCharacter } from '../../characters/registry'
import type { CharacterClip } from '../../characters/types'
import { ArgumentColumn } from './ArgumentColumn'
import { heardMessage, TOPICS } from './messages'
import { MAX_TURNS, type ArgumentState, type EndReason } from './turns'
import { useArgument } from './useArgument'

type Props = {
  cast: readonly string[]
  model: string
  onNewArgument: () => void
}

const END_TEXT: Record<EndReason, string> = {
  limit: `${MAX_TURNS} turns done. They are waiting for you: type in any chat.`,
  button: 'Stopped. Type in any chat to ask one of them something.',
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

export function ArgumentArena({ cast, model, onNewArgument }: Props) {
  const { state, chats, start, stop, sendStudent } = useArgument(cast, model)
  const isRunning = state.status === 'running'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
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
                className="bg-main text-sidenav-blue rounded-md px-4 py-1.5 font-bold hover:brightness-95 active:scale-95 motion-safe:transition"
              >
                {topic.label}
              </button>
            ))}
          </>
        )}
        {isRunning && (
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
              {state.error
                ? `${END_TEXT[state.endReason ?? 'error']} ${state.error}`
                : END_TEXT[state.endReason ?? 'error']}
            </span>
            <button
              type="button"
              onClick={onNewArgument}
              className="bg-main text-sidenav-blue rounded-md px-4 py-1.5 font-bold hover:brightness-95 active:scale-95 motion-safe:transition"
            >
              New argument
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cast.map((id, index) => (
          <div
            key={id}
            className="motion-safe:animate-fade-up flex flex-col items-center"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <div
              className={`motion-safe:transition-transform motion-safe:duration-300 ${
                isRunning && state.speaker === id
                  ? 'motion-safe:-translate-y-2 motion-safe:scale-110'
                  : ''
              }`}
            >
              <CharacterAvatar
                characterId={id}
                clip={clipFor(state, id, chats[id]?.isRunning ?? false)}
                size={96}
              />
            </div>
            <span className="font-title text-heading text-lg tracking-wide">
              {getCharacter(id)?.name}
            </span>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-3">
        {cast.map(id => (
          <ArgumentColumn
            key={id}
            characterId={id}
            chat={chats[id]!}
            pending={(state.inbox[id] ?? []).map(heard =>
              heardMessage(heard, getCharacter(heard.from)?.name ?? heard.from)
            )}
            isSpeaking={isRunning && state.speaker === id}
            isDisabled={
              state.status === 'idle' ||
              (state.status === 'ended' && !!chats[id]?.isRunning)
            }
            placeholder={
              state.status === 'idle'
                ? 'Pick a topic first'
                : isRunning
                  ? 'Step in to stop the argument…'
                  : 'Ask them something…'
            }
            onSend={text => void sendStudent(id, text)}
          />
        ))}
      </div>
    </div>
  )
}
