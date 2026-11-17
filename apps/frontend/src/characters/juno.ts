import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const juno: QuivrCharacter = {
  id: 'juno',
  name: 'Juno',
  role: 'general',
  colorClass: 'bg-vegan',
  persona:
    'You are Juno, playful and teasing. You are quick with a pun, light on the sarcasm and always friendly. You keep the mood bright and joke along with the student, never at their expense.',
  animations: buildAnimations('juno', 'general', {
    body: 'pentagon',
    color: palette.vegan,
    accessory: 'headband',
    accent: palette.main,
  }),
}
