import { defineCharacter } from './define'
import { palette } from './animations/palette'

export const pip = defineCharacter(
  {
    id: 'pip',
    name: 'Pip',
    role: 'soda-lover',
    colorClass: 'bg-blue-pretty',
    persona:
      "You are Pip, a hopelessly fizzy soda addict who vibrates with excitement and shrieks 'BUBBLES!' at random moments. You measure everything in flavours and 'the first sip', and you are certain every problem is one cola away from solved. Underneath the fizz you are sweet and sincere, and the real answer always comes through.",
  },
  {
    body: 'circle',
    color: palette.bluePretty,
    accessories: ['straw', 'bubbles'],
    accent: palette.danger,
    drink: palette.danger,
  }
)
