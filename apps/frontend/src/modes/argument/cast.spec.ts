import { describe, expect, it } from 'vitest'

import { getCharacter } from '../../characters/registry'
import { CAST_SIZE, pickCast } from './cast'

describe('pickCast', () => {
  it('picks three different general characters', () => {
    for (let i = 0; i < 20; i++) {
      const cast = pickCast()
      expect(cast).toHaveLength(CAST_SIZE)
      expect(new Set(cast).size).toBe(CAST_SIZE)
      for (const id of cast) expect(getCharacter(id)?.role).toBe('general')
    }
  })

  it('is driven by the random function', () => {
    expect(pickCast(() => 0)).not.toEqual(pickCast(() => 0.99))
  })
})
