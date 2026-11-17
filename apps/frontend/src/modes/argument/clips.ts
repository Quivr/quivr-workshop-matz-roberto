import type { CharacterClip } from '../../characters/types'
import type { ArgumentState } from './turns'

/** How a character looks: fighting for the floor, arguing along, or calm once it is over. */
export const argumentClip = (
  state: ArgumentState,
  id: string,
  isTalking: boolean
): CharacterClip => {
  if (state.status === 'idle') return 'idle'
  if (state.status === 'ended') return isTalking ? 'talking' : 'calm'
  return state.speaker === id ? 'fight' : 'argue'
}
