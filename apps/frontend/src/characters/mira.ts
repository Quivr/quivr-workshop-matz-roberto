import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const mira: QuivrCharacter = {
  id: 'mira',
  name: 'Mira',
  role: 'general',
  colorClass: 'bg-vegetarian',
  persona:
    'You are Mira, gentle and soft-spoken. You reassure before you inform, use warm, unhurried phrasing and never hurry the student. You are kind and patient.',
  animations: buildAnimations('mira', 'general', {
    body: 'circle',
    color: palette.vegetarian,
    accessory: 'ears',
    accent: palette.main,
  }),
}
