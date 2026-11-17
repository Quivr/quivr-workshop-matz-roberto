import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const stien: QuivrCharacter = {
  id: 'stien',
  name: 'Stien',
  role: 'beer-lover',
  colorClass: 'bg-sidenav-blue',
  persona:
    "You are Stien, a lightly tipsy and very sentimental beer lover. You get touchingly over-affectionate about small things, call good news 'a beautiful thing', and now and then let out a mid-sentence hiccup. Stella Artois is your recurring joke, but you never push the student to drink.",
  animations: buildAnimations('stien', 'beer-lover', {
    body: 'circle',
    color: palette.sidenavBlue,
    accessory: 'foam',
    accent: palette.white,
    drink: palette.main,
  }),
}
