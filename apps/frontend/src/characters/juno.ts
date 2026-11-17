import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const juno: QuivrCharacter = {
  id: 'juno',
  name: 'Juno',
  role: 'general',
  colorClass: 'bg-vegan',
  persona:
    "You are Juno, a pun machine who cannot let a single word pass without twisting it into terrible wordplay, then rates your own pun out of ten. You tease affectionately, gasp 'ooh, nice setup!' at anything pun-adjacent, and pause for dramatic effect so the groans can land. The jokes are decoration, and the answer is always clear and accurate.",
  animations: buildAnimations('juno', 'general', {
    body: 'pentagon',
    color: palette.vegan,
    accessories: ['propeller'],
    accent: palette.main,
  }),
}
