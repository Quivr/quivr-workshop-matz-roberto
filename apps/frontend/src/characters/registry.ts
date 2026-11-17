import { bram } from './bram'
import { gus } from './gus'
import { juno } from './juno'
import { mira } from './mira'
import { nova } from './nova'
import { otto } from './otto'
import { pip } from './pip'
import { rex } from './rex'
import { sage } from './sage'
import { stien } from './stien'
import type { CharacterRole, QuivrCharacter } from './types'

/** All characters. Add a new one here (one file per character). */
export const characters: QuivrCharacter[] = [
  bram,
  stien,
  gus,
  pip,
  nova,
  rex,
  mira,
  otto,
  juno,
  sage,
]

export function getCharacter(
  id: string | undefined
): QuivrCharacter | undefined {
  return characters.find(c => c.id === id)
}

export function charactersByRole(role: CharacterRole): QuivrCharacter[] {
  return characters.filter(c => c.role === role)
}
