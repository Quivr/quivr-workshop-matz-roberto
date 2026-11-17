import { getCharacter } from '../../characters/registry'
import { ArgumentBar } from '../argument/ArgumentBar'
import { ArgumentForm } from '../argument/ArgumentForm'
import { ArgumentThread } from '../argument/ArgumentThread'
import { BarScene } from '../chill/BarScene'
import { formatRemaining } from '../chill/breakMachine'
import { castStatus, PARTY_CAST, partyClips } from './cast'
import type { useParty } from './useParty'

/** Avatars beside the balloons are small here: the bar already has four of its own. */
const THREAD_AVATAR = 32

type Props = { party: ReturnType<typeof useParty> }

/** The bar, the argument and the student's chat, on one screen. */
export function PartyRoom({ party }: Props) {
  const { state, breakState, away } = party
  const isOnBreak = breakState.phase === 'break'

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
      <div className="px-4 pt-3">
        <BarScene
          showFromHeight={760}
          clips={partyClips(state, party.talking)}
          reactionLine={party.reaction}
          breakState={breakState}
          gagLine={party.gagState.line}
          banterLine={party.banterState.line}
          pip={party.gagState.pip}
        />
      </div>

      <div className="border-schedule-border-grey space-y-2 border-b px-4 py-2">
        <ArgumentBar
          state={state}
          onStart={topic => void party.start(topic)}
          onStop={party.stop}
          onNewArgument={party.newArgument}
          idleTitle="Start a fight, or just ask the bar."
          isBusy={party.isBusy}
        />
        <ul
          aria-label="Who is arguing"
          className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm"
        >
          {PARTY_CAST.map(id => {
            const character = getCharacter(id)
            const status = castStatus(state, id, away)
            return (
              <li
                key={id}
                className="flex items-center gap-1.5"
              >
                <span
                  aria-hidden
                  className={`ring-main-text/40 size-2 rounded-full ring-1 ${character?.colorClass ?? ''}`}
                />
                <b className="text-heading font-title tracking-wide">
                  {character?.name}
                </b>
                <span className="text-muted">{status}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {party.rows.length === 0 && (
        <p className="text-muted px-4 pt-3 text-center text-sm">
          Pick a topic and watch Gus, Bram and Stien fight, or write below and
          ask them something. Step in while they argue and they calm down.
        </p>
      )}
      <ArgumentThread
        cast={PARTY_CAST}
        rows={party.rows}
        durations={party.durations}
        error={party.error}
        avatarSize={THREAD_AVATAR}
      />

      {isOnBreak && (
        <div
          role="status"
          className="bg-surface text-main-text border-main mx-4 mb-2 flex items-center justify-between gap-3 rounded-md border-l-4 px-3 py-2 text-sm shadow-sm"
        >
          <span>
            <b className="text-heading">Gus is on a Stella Artois break.</b> He
            is out of the argument and won’t answer; Bram and Stien will.
          </span>
          <span className="shrink-0">
            Back in{' '}
            <time
              role="timer"
              className="font-title text-heading text-xl tabular-nums"
            >
              {formatRemaining(breakState.remainingMs)}
            </time>
          </span>
        </div>
      )}
      <ArgumentForm
        placeholder={
          state.status === 'running'
            ? 'Step in to calm them down…'
            : state.status === 'idle'
              ? 'Ask the bar something…'
              : 'Ask them something…'
        }
        isDisabled={party.isReplying}
        onSend={party.send}
      />
    </div>
  )
}
