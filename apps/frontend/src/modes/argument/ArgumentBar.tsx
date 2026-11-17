import { TOPICS, type Topic } from './messages'
import { MAX_TURNS, type ArgumentState, type EndReason } from './turns'

const END_TEXT: Record<EndReason, string> = {
  limit: `${MAX_TURNS} turns done. They are waiting for you: type below.`,
  button: 'Stopped. Type below to ask one of them something.',
  student: 'You stepped in. The argument is over.',
  error: 'The argument broke off.',
  empty: 'Not enough of them are around to argue.',
}

export const buttonClass =
  'bg-main text-sidenav-blue rounded-md px-4 py-1.5 font-bold hover:brightness-95 active:scale-95 disabled:opacity-50 motion-safe:transition motion-safe:disabled:active:scale-100'

type Props = {
  state: ArgumentState
  onStart: (topic: Topic) => void
  onStop: () => void
  onNewArgument: () => void
  /** Wording of the heading before the argument starts. */
  idleTitle?: string
  /** True while something else is running: a topic cannot be started now. */
  isBusy?: boolean
}

/** The argument's controls: pick a topic, turn counter and "Stop it!", then "New argument". */
export function ArgumentBar({
  state,
  onStart,
  onStop,
  onNewArgument,
  idleTitle = 'What should they fight about?',
  isBusy = false,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-center">
      {state.status === 'idle' && (
        <>
          <span className="font-title text-heading text-2xl tracking-wide">
            {idleTitle}
          </span>
          {TOPICS.map(topic => (
            <button
              key={topic.id}
              type="button"
              disabled={isBusy}
              onClick={() => onStart(topic)}
              className={buttonClass}
            >
              {topic.label}
            </button>
          ))}
        </>
      )}
      {state.status === 'running' && (
        <>
          <span
            className="text-main-text text-sm"
            role="status"
          >
            Turn {state.turn + 1} of {MAX_TURNS} · {state.topic}
          </span>
          <button
            type="button"
            onClick={onStop}
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
  )
}
