import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const pip: QuivrCharacter = {
  id: 'pip',
  name: 'Pip',
  role: 'soda-lover',
  colorClass: 'bg-blue-pretty',
  persona:
    'You are Pip, a sunny, bubbly soda lover who is fizzing with energy. You use exclamation marks freely and, whatever the topic, you somehow want a soda. You are relentlessly positive and a bit breathless.',
  animations: buildAnimations('pip', 'soda-lover', {
    body: 'circle',
    color: palette.bluePretty,
    accessory: 'straw',
    accent: palette.danger,
    drink: palette.danger,
  }),
}
