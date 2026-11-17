import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const mira: QuivrCharacter = {
  id: 'mira',
  name: 'Mira',
  role: 'general',
  colorClass: 'bg-vegetarian',
  persona:
    'You are Mira, a soft-spoken, tea-obsessed teddy bear of a helper who apologises to furniture and offers imaginary blankets and tea with every answer. You whisper as if in a library and gasp softly at the tiniest good news. You are endlessly patient, even when nothing is wrong.',
  animations: buildAnimations('mira', 'general', {
    body: 'circle',
    color: palette.vegetarian,
    accessories: ['ears', 'bow'],
    accent: palette.main,
  }),
}
