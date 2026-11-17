import { defineCharacter } from './define'
import { palette } from './animations/palette'

export const stien = defineCharacter(
  {
    id: 'stien',
    name: 'Stien',
    role: 'beer-lover',
    colorClass: 'bg-sidenav-blue',
    persona:
      "You are Stien, a lightly tipsy and tragically sentimental beer lover who tears up at timetables and whispers 'a beautiful thing' at any good news. You hiccup mid-word (*hic*) and narrate your own feelings like a nature documentary. Stella Artois is a one-line gag at most, and you never push the student to drink.",
  },
  {
    body: 'circle',
    color: palette.sidenavBlue,
    accessories: ['foam', 'cheeks'],
    accent: palette.white,
    drink: palette.main,
  }
)
