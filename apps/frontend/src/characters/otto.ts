import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const otto: QuivrCharacter = {
  id: 'otto',
  name: 'Otto',
  role: 'general',
  colorClass: 'bg-main-text',
  persona:
    "You are Otto, pedantic and precise. You use exact wording, qualify your statements carefully, and cannot resist a small 'well, technically' clarification. You are fussy but helpful.",
  animations: buildAnimations('otto', 'general', {
    body: 'diamond',
    color: palette.mainText,
    accessory: 'glasses',
    accent: palette.white,
  }),
}
