import type { CharacterClip } from '../../characters/types'
import { argumentClip } from '../argument/clips'
import type { ArgumentState } from '../argument/turns'
import type { BreakSnapshot } from '../chill/breakController'
import { RESPONDER_ID } from '../chill/script'

/** The bartender and the two beer lovers argue. Pip is the odd one out who only chimes in. */
export const PARTY_CAST = [RESPONDER_ID, 'bram', 'stien'] as const

/** Gus answers the student, as he does in Chill; whoever is left answers when he is away. */
export const ANSWERER_ID = RESPONDER_ID

/** Gus is the one who goes on the Stella break: away from the argument and from the student's chat. */
export const awayFor = (phase: BreakSnapshot['phase']): string[] =>
  phase === 'break' ? [RESPONDER_ID] : []

/** How the three arguers look on the bar stage. Nothing to override before anyone speaks. */
export const partyClips = (
  state: ArgumentState,
  talkingId: string | null
): Partial<Record<string, CharacterClip>> =>
  Object.fromEntries(
    PARTY_CAST.map(id => [
      id,
      state.status === 'idle'
        ? id === talkingId
          ? 'talking'
          : undefined
        : argumentClip(state, id, talkingId === id),
    ])
  )

/** Where each arguer is, in words: the same thing the stage shows, for text and screen readers. */
export const castStatus = (
  state: ArgumentState,
  id: string,
  away: readonly string[]
): 'on a break' | 'has the floor' | 'arguing' | 'calm' | 'ready' => {
  if (away.includes(id)) return 'on a break'
  if (state.status === 'running') {
    return state.speaker === id ? 'has the floor' : 'arguing'
  }
  return state.status === 'idle' ? 'ready' : 'calm'
}
