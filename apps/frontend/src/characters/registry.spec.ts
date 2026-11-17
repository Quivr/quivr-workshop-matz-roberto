import { describe, expect, it } from 'vitest'

import { clipsForRole } from './animations/build'
import { charactersByRole, characters, getCharacter } from './registry'

const IDS = [
  'bram',
  'stien',
  'gus',
  'pip',
  'nova',
  'rex',
  'mira',
  'otto',
  'juno',
  'sage',
]

describe('character registry', () => {
  it('has all 10 ids, unique', () => {
    expect(characters.map(c => c.id).sort()).toEqual([...IDS].sort())
    expect(new Set(characters.map(c => c.id)).size).toBe(10)
  })

  it('has the expected role counts', () => {
    expect(charactersByRole('beer-lover')).toHaveLength(2)
    expect(charactersByRole('bartender')).toHaveLength(1)
    expect(charactersByRole('soda-lover')).toHaveLength(1)
    expect(charactersByRole('general')).toHaveLength(6)
  })

  it('charactersByRole only returns that role', () => {
    expect(charactersByRole('beer-lover').map(c => c.id)).toEqual([
      'bram',
      'stien',
    ])
    expect(charactersByRole('bartender').map(c => c.id)).toEqual(['gus'])
    for (const c of charactersByRole('general')) expect(c.role).toBe('general')
  })

  it('getCharacter finds by id and returns undefined otherwise', () => {
    expect(getCharacter('gus')?.name).toBe('Gus')
    expect(getCharacter('nobody')).toBeUndefined()
    expect(getCharacter(undefined)).toBeUndefined()
  })

  it('gives every character idle and talking animations', () => {
    for (const c of characters) {
      expect(c.animations.idle, c.id).toBeTruthy()
      expect(c.animations.talking, c.id).toBeTruthy()
    }
  })

  it('gives each role its required clips', () => {
    for (const c of characters) {
      for (const clip of clipsForRole(c.role)) {
        expect(c.animations[clip], `${c.id}/${clip}`).toBeTruthy()
      }
      if (c.role === 'general') {
        for (const clip of ['argue', 'fight', 'calm'] as const) {
          expect(c.animations[clip], `${c.id}/${clip}`).toBeTruthy()
        }
      } else {
        expect(c.animations.break, `${c.id}/break`).toBeTruthy()
      }
    }
  })

  it('keeps each animation small', () => {
    for (const c of characters) {
      for (const [clip, data] of Object.entries(c.animations)) {
        const bytes = JSON.stringify(data).length
        expect(bytes, `${c.id}/${clip}`).toBeLessThan(9 * 1024)
      }
    }
  })

  it('has colour class, persona of 2-4 sentences and distinct personas', () => {
    for (const c of characters) {
      expect(c.colorClass).toMatch(/^bg-/)
      const sentences = c.persona.split(/(?<=[.!?])\s+/).length
      expect(sentences, c.id).toBeGreaterThanOrEqual(2)
      expect(sentences, c.id).toBeLessThanOrEqual(4)
    }
    expect(new Set(characters.map(c => c.persona)).size).toBe(10)
  })

  it('keeps the tone rules', () => {
    for (const c of characters) {
      expect(c.persona.toLowerCase(), c.id).not.toMatch(/drunk|invent|guess/)
    }
  })
})
