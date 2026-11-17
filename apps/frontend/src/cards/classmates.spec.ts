import { describe, expect, it } from 'vitest'

import {
  formatDay,
  formatRange,
  formatTime,
  groupClassmates,
  parseClassmates,
  plural,
  sortClassmates,
} from './classmates'
import type { Classmate } from './classmates'

const mate = (name: string, isSameClass: boolean): Classmate => ({
  id: name,
  name,
  isSameClass,
  title: 'Something',
  start: '2026-11-17T09:00:00Z',
  end: '2026-11-17T11:00:00Z',
  location: null,
})

describe('formatting', () => {
  it('formats times in Brussels time', () => {
    expect(formatTime('2026-11-17T09:00:00Z')).toBe('10:00')
    expect(formatRange('2026-11-17T09:00:00Z', '2026-11-17T10:30:00Z')).toBe(
      '10:00–11:30'
    )
  })

  it('does not throw on invalid dates', () => {
    expect(formatTime('nope')).toBe('?')
    expect(formatTime('')).toBe('?')
    expect(formatRange('', 'x')).toBe('?–?')
  })

  it('formats a plain date without shifting the day', () => {
    expect(formatDay('2026-11-17')).toBe('Tue 17 Nov')
    expect(formatDay('garbage')).toBe('garbage')
  })

  it('pluralises', () => {
    expect(plural(1, 'friend')).toBe('1 friend')
    expect(plural(0, 'friend')).toBe('0 friends')
    expect(plural(12, 'friend')).toBe('12 friends')
  })
})

describe('sorting and grouping', () => {
  const input = [
    mate('Zoe Example', false),
    mate('Bea Example', true),
    mate('Abe Example', false),
    mate('Cy Example', true),
  ]

  it('puts same-class first, then alphabetical', () => {
    expect(sortClassmates(input).map(c => c.name)).toEqual([
      'Bea Example',
      'Cy Example',
      'Abe Example',
      'Zoe Example',
    ])
  })

  it('does not mutate the input', () => {
    const copy = [...input]
    sortClassmates(input)
    expect(input).toEqual(copy)
  })

  it('splits into same class and busy elsewhere', () => {
    const { sameClass, busyElsewhere } = groupClassmates(input)
    expect(sameClass.map(c => c.name)).toEqual(['Bea Example', 'Cy Example'])
    expect(busyElsewhere.map(c => c.name)).toEqual([
      'Abe Example',
      'Zoe Example',
    ])
  })

  it('handles an empty list', () => {
    expect(groupClassmates([])).toEqual({ sameClass: [], busyElsewhere: [] })
  })
})

describe('parseClassmates', () => {
  it('returns null for unusable results', () => {
    for (const bad of [undefined, null, 'text', 42, [], {}, { classes: 'x' }]) {
      expect(parseClassmates(bad)).toBeNull()
    }
  })

  it('keeps an empty classes array', () => {
    expect(
      parseClassmates({ date: '2026-11-17', friendsChecked: 3, classes: [] })
    ).toEqual({ date: '2026-11-17', friendsChecked: 3, classes: [] })
  })

  it('fills defaults for partial data and drops junk entries', () => {
    const parsed = parseClassmates({
      classes: [
        null,
        { title: 'Algebra', start: 'x', classmates: 'nope' },
        {
          start: '2026-11-17T09:00:00Z',
          location: '   ',
          classmates: [
            { name: 'Ada Example', isSameClass: true },
            { name: '' },
            7,
            { name: 'Bo Example', isSameClass: 'yes' },
          ],
        },
      ],
    })
    expect(parsed?.friendsChecked).toBeNull()
    expect(parsed?.classes).toHaveLength(2)
    expect(parsed?.classes[0]).toMatchObject({
      title: 'Algebra',
      location: null,
      classmates: [],
    })
    expect(parsed?.classes[1]?.title).toBe('Untitled class')
    expect(parsed?.classes[1]?.location).toBeNull()
    expect(
      parsed?.classes[1]?.classmates.map(c => [c.name, c.isSameClass])
    ).toEqual([
      ['Ada Example', true],
      ['Bo Example', false],
    ])
  })
})
