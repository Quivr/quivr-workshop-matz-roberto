import { useEffect, useState, useSyncExternalStore } from 'react'

import { buildThreadRows } from '../argument/rows'
import { useArgument } from '../argument/useArgument'
import { BREAK_END_LINE, RESPONDER_ID } from '../chill/script'
import { useBar } from '../chill/useBar'
import { ANSWERER_ID, awayFor, PARTY_CAST } from './cast'
import { createReactions, reactionAt } from './reactions'

/**
 * Argument and Chill on one screen. The argument is Argument's own hook, the
 * bar is Chill's own `useBar`; this only wires them together:
 * - Gus on a break is `away` for the argument, so the turn order skips him
 *   and takes him back when he returns;
 * - the student's messages go through the break controller (every 5th one
 *   starts a break) and into the argument's thread, which calms the argument;
 * - the bar stands down while an argument runs and reacts to it instead, with
 *   scripted lines (no LLM).
 */
export function useParty(model: string, factsModel?: string) {
  const [reactions] = useState(() => createReactions())
  const reaction = useSyncExternalStore(
    reactions.subscribe,
    reactions.getSnapshot
  )
  const bar = useBar({
    model,
    factsModel,
    onBreakStart: reactions.stop,
    onBreakEnd: () =>
      reactions.play([{ speaker: RESPONDER_ID, text: BREAK_END_LINE }]),
  })
  const away = awayFor(bar.breakState.phase)
  const argument = useArgument(PARTY_CAST, model, {
    isAway: id => away.includes(id),
    answerer: ANSWERER_ID,
    canChatFirst: true,
  })
  const { state } = argument

  const isArguing = state.status === 'running'
  const isBusy = isArguing || argument.isRunning || reaction.line !== null
  useEffect(() => {
    bar.bar.setBusy(() => isBusy)
    bar.bar.setRunning(argument.isRunning)
  })

  // The bar reacts as the argument drags on, and goes quiet when it is over.
  useEffect(() => {
    if (state.status !== 'running') reactions.stop()
    else {
      const lines = reactionAt(state.turn, away)
      if (lines.length > 0) reactions.play(lines)
    }
    // Only a new turn or a new status counts: `away` is read as it is then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.turn, reactions])
  useEffect(() => reactions.stop, [reactions])

  const send = (text: string) => {
    reactions.stop()
    bar.bar.banter.interrupt()
    const answer = (question: string) => argument.sendStudent(question)
    // On a break Gus does not answer, but the student still gets an answer
    // from someone else: the chat is never blocked.
    bar.controller.route(text, { ask: answer, sleepy: q => void answer(q) })
  }

  const newParty = () => {
    reactions.stop()
    bar.controller.reset()
    argument.newArgument()
  }

  return {
    state,
    rows: buildThreadRows(argument.thread, argument.live),
    durations: argument.durations,
    error: argument.error,
    isReplying: argument.isRunning && !isArguing,
    talking: argument.live?.speaker ?? null,
    away,
    breakState: bar.breakState,
    gagState: bar.gagState,
    banterState: bar.banterState,
    reaction: reaction.line,
    isBusy,
    start: argument.start,
    stop: () => {
      reactions.stop()
      argument.stop()
    },
    send,
    newArgument: argument.newArgument,
    newParty,
  }
}
