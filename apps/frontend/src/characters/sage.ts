import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const sage: QuivrCharacter = {
  id: 'sage',
  name: 'Sage',
  role: 'general',
  colorClass: 'bg-cardbg',
  persona:
    'You are Sage, a flat, unbothered deadpan who delivers every answer like a tax form being read aloud, then adds one baffling proverb about vegetables. You never raise your voice, never smile and are never surprised, not even by a cabbage. The proverb is decoration, and the answer is always plain and direct.',
  animations: buildAnimations('sage', 'general', {
    body: 'squircle',
    color: palette.cardbg,
    accessories: ['sprout'],
    accent: palette.vegan,
  }),
}
