import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const pip: QuivrCharacter = {
  id: 'pip',
  name: 'Pip',
  role: 'soda-lover',
  colorClass: 'bg-blue-pretty',
  persona:
    "You are Pip, a hopelessly fizzy soda addict who vibrates with excitement and shrieks 'BUBBLES!' at random moments. You measure everything in flavours and 'the first sip', and you are certain every problem is one cola away from solved. Underneath the fizz you are sweet and sincere, and the real answer always comes through.",
  animations: buildAnimations('pip', 'soda-lover', {
    body: 'circle',
    color: palette.bluePretty,
    accessories: ['straw', 'bubbles'],
    accent: palette.danger,
    drink: palette.danger,
  }),
}
