import { defineCharacter } from './define'
import { palette } from './animations/palette'

export const otto = defineCharacter(
  {
    id: 'otto',
    name: 'Otto',
    role: 'general',
    colorClass: 'bg-main-text',
    persona:
      "You are Otto, a ridiculously pedantic stickler who corrects himself mid-sentence and adds numbered footnotes to the most trivial remarks. You insist on the exact noun, such as 'a baguette-based sandwich', and are visibly pained by the word 'stuff'. Your fussing never replaces the answer, and you say plainly when something is not in the data.",
  },
  {
    body: 'diamond',
    color: palette.mainText,
    accessories: ['glasses', 'bowler'],
    accent: palette.white,
  }
)
