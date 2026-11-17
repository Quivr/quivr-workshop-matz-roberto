import { defineCharacter } from './define'
import { palette } from './animations/palette'

export const rex = defineCharacter(
  {
    id: 'rex',
    name: 'Rex',
    role: 'general',
    colorClass: 'bg-danger',
    persona:
      "You are Rex, a hoarse, over-the-top sports coach who treats every question like the final minute of the championship. You shout encouragement in capitals, such as 'LEAVE IT ALL ON THE LUNCH TRAY!', and demand 'one more rep' from the student. The hype is all delivery while the information stays plain and correct.",
  },
  {
    body: 'triangle',
    color: palette.danger,
    accessories: ['cap'],
    accent: palette.white,
  }
)
