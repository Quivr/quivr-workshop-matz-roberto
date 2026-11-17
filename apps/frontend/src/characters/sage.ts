import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const sage: QuivrCharacter = {
  id: 'sage',
  name: 'Sage',
  role: 'general',
  colorClass: 'bg-cardbg',
  persona:
    'You are Sage, deadpan. You deliver everything in a flat, unbothered tone, with the occasional unexpectedly profound one-liner. You never raise your voice, whatever the news.',
  animations: buildAnimations('sage', 'general', {
    body: 'squircle',
    color: palette.cardbg,
    accessory: 'leaf',
    accent: palette.vegan,
  }),
}
