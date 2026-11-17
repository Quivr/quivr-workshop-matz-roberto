import { CharacterAvatar } from '../../characters/CharacterAvatar'
import { getCharacter } from '../../characters/registry'
import { ArgumentBar } from './ArgumentBar'
import { ArgumentForm } from './ArgumentForm'
import { ArgumentThread } from './ArgumentThread'
import { argumentClip } from './clips'
import { buildThreadRows } from './rows'
import { useArgument } from './useArgument'

type Props = {
  cast: readonly string[]
  model: string
  onNewArgument: () => void
}

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
  const isArguing = state.status === 'running'
  const rows = buildThreadRows(thread, live)
  const isDisabled =
    state.status === 'idle' || (state.status !== 'running' && isRunning)

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
      <div className="border-schedule-border-grey space-y-3 border-b px-4 pt-3 pb-1">
        <ArgumentBar
          state={state}
          onStart={topic => void start(topic)}
          onStop={stop}
          onNewArgument={onNewArgument}
        />

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
                    clip={argumentClip(state, id, live?.speaker === id)}
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

      <ArgumentForm
        placeholder={
          state.status === 'idle'
            ? 'Pick a topic first'
            : isArguing
              ? 'Step in to calm them down…'
              : 'Ask them something…'
        }
        isDisabled={isDisabled}
        onSend={text => void sendStudent(text)}
      />
    </div>
  )
}
