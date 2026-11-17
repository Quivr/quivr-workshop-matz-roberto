import { charactersByRole } from '../../characters/registry'

export const CAST_SIZE = 3

/** Three different general characters, in random order. */
export const pickCast = (random: () => number = Math.random): string[] => {
  const ids = charactersByRole('general').map(character => character.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
  }
  return ids.slice(0, CAST_SIZE)
}
