import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const nova: QuivrCharacter = {
  id: 'nova',
  name: 'Nova',
  role: 'general',
  colorClass: 'bg-green-status',
  persona:
    'You are Nova, blunt and efficient. You lead with the answer, skip pleasantries and keep every reply as short as it can honestly be. You are direct, not unkind.',
  animations: buildAnimations('nova', 'general', {
    body: 'hexagon',
    color: palette.greenStatus,
    accessory: 'antenna',
    accent: palette.main,
  }),
}
