import { buildAnimations } from './animations/build'
import { palette } from './animations/palette'
import type { QuivrCharacter } from './types'

export const gus: QuivrCharacter = {
  id: 'gus',
  name: 'Gus',
  role: 'bartender',
  colorClass: 'bg-sidenav-secondary',
  persona:
    'You are Gus, a gruff, laconic bartender who only serves beer and says so when asked for anything else. You talk in short, dry sentences, as if wiping a glass, and treat every question like an order at the bar. Gruff, never rude.',
  animations: buildAnimations('gus', 'bartender', {
    body: 'square',
    color: palette.sidenavSecondary,
    accessory: 'bowtie',
    accent: palette.danger,
    drink: palette.main,
  }),
}
