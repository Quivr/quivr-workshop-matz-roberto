import { TOPICS, type Topic } from './messages'
import { isActive, type ArgumentState, type EndReason } from './turns'

const endText = (reason: EndReason, maxTurns: number | null): string => {
  switch (reason) {
    case 'limit':
      return `${maxTurns} turns done. They are waiting for you: type below.`
    case 'button':
      return 'Stopped. Type below to ask one of them something.'
    case 'error':
      return 'The argument broke off.'
    case 'empty':
      return 'Not enough of them are around to argue.'
  }
}

const liveText = (state: ArgumentState): string => {
  switch (state.status) {
    case 'answering':
      return 'You stepped in. They are answering you…'
    case 'calm':
      return 'Calm for a moment… then they pick the fight back up.'
    default:
      return state.maxTurns === null
        ? `Turn ${state.turn + 1} · ${state.topic} · they keep going until you stop them`
        : `Turn ${state.turn + 1} of ${state.maxTurns} · ${state.topic}`
  }
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

/** The argument's controls: pick a topic, then what they are up to and "Stop it!" (always there, it is the way to end it), then "New argument". */
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
      {isActive(state) && (
        <>
          <span
            className="text-main-text text-sm"
            role="status"
          >
            {liveText(state)}
          </span>
          <button
            type="button"
            onClick={onStop}
            className="border-danger text-danger bg-surface hover:bg-danger/10 rounded-md border-2 px-5 py-2 text-base font-bold active:scale-95 motion-safe:transition"
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
            {endText(state.endReason ?? 'error', state.maxTurns)}
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
