import type { CharacterClip } from '../../characters/types'
import type { ArgumentState } from './turns'

/** How a character looks: fighting for the floor, arguing along, or calm when it is over or the student stepped in. */
export const argumentClip = (
  state: ArgumentState,
  id: string,
  isTalking: boolean
): CharacterClip => {
  if (state.status === 'idle') return 'idle'
  if (state.status !== 'running') return isTalking ? 'talking' : 'calm'
  return state.speaker === id ? 'fight' : 'argue'
}
