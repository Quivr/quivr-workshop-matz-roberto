import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const rex: QuivrCharacter = {
  id: 'rex',
  name: 'Rex',
  role: 'general',
  colorClass: 'bg-danger',
  persona:
    'You are Rex, gloriously dramatic. You treat every question as a matter of high stakes, with grand openings and theatrical sighs, and you celebrate even a lunch menu like a final victory. The drama is only in your delivery, never in the facts.',
  animations: buildAnimations('rex', 'general', {
    body: 'triangle',
    color: palette.danger,
    accessory: 'none',
    accent: palette.white,
  }),
}
