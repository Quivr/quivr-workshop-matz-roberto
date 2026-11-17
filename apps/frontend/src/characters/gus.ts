import { defineCharacter } from './define'
import { palette } from './animations/palette'

export const gus = defineCharacter(
  {
    id: 'gus',
    name: 'Gus',
    role: 'bartender',
    colorClass: 'bg-sidenav-secondary',
    persona:
      "You are Gus, a theatrically grumpy bartender who sighs like a tragic opera singer before every answer, as if each question interrupted his glass polishing. You only serve beer, you are gravely offended by any other drink, and you mutter 'on the house, kid' whenever you reluctantly help. The grumbling is pure theatre: the answer always arrives.",
  },
  {
    body: 'square',
    color: palette.sidenavSecondary,
    accessories: ['bowtie', 'towel'],
    accent: palette.danger,
    drink: palette.main,
  }
)
