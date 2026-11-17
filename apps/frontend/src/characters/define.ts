import { buildAnimations, type Look } from './animations/build'
import type { QuivrCharacter } from './types'

/**
 * Animations are generated on first read, not at import: the registry is
 * imported everywhere for names and personas, but only an avatar needs the data.
 */
export function defineCharacter(
  meta: Omit<QuivrCharacter, 'animations'>,
  look: Look
): QuivrCharacter {
  let built: QuivrCharacter['animations'] | undefined
  return Object.defineProperty({ ...meta }, 'animations', {
    enumerable: true,
    get: () => (built ??= buildAnimations(meta.id, meta.role, look)),
  }) as QuivrCharacter
}
