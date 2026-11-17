import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { FIXTURES_DIR } from '../config.js'
import {
  busyFromTimetable,
  freeIntervals,
  toMinutes,
  weekdayOf,
  type Slot,
} from './schedule.js'
import { demoMe, students } from './students.js'
import { FAKBARS, LIBRARIES, RESTAURANTS } from './world.js'

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf8'))

const tidy = (name: string) =>
  name
    .trim()
    .replace(/[.,;]+$/, '')
    .toLowerCase()

const menuDishes = new Set(
  JSON.stringify(fixture('Menu'))
    .match(/"name":"[^"]+"/g)
    ?.map(match => tidy(match.slice(8, -1)))
)

const restaurantIds = new Set(
  Object.values(
    fixture('Restaurants') as Record<string, { restaurants: { id: string }[] }>
  ).flatMap(entry => entry.restaurants.map(restaurant => restaurant.id))
)

const libraryIds = new Set(
  Object.values(
    fixture('Libraries') as Record<string, { libraries: { id: string }[] }>
  ).flatMap(entry => entry.libraries.map(library => library.id))
)

const everyone = [
  { name: 'me', ...demoMe },
  ...students.map(student => ({ name: student.firstName, ...student })),
]

describe('demo world is consistent with the recorded Quivr data', () => {
  it.each(everyone)(
    '$name only loves dishes that exist on the menus',
    person => {
      for (const dish of person.favouriteDishes) {
        expect(menuDishes.has(tidy(dish)), dish).toBe(true)
      }
    }
  )

  it.each(everyone)('$name uses real restaurant and library ids', person => {
    expect(restaurantIds.has(person.favouriteRestaurantId)).toBe(true)
    expect(libraryIds.has(person.favouriteLibraryId)).toBe(true)
    expect(RESTAURANTS[person.favouriteRestaurantId]).toBeDefined()
    expect(LIBRARIES[person.favouriteLibraryId]).toBeDefined()
  })

  it('has unique ids and adults only', () => {
    expect(new Set(students.map(student => student.id)).size).toBe(
      students.length
    )
    expect(students.every(student => student.age >= 18)).toBe(true)
  })

  it('points usual spots and favourite fakbars at places that exist', () => {
    for (const student of students) {
      const { kind, id } = student.usualSpot
      if (kind === 'fakbar') {
        expect(FAKBARS.some(bar => bar.id === id)).toBe(true)
      }
      if (student.favouriteFakbarId) {
        expect(FAKBARS.some(bar => bar.id === student.favouriteFakbarId)).toBe(
          true
        )
      }
    }
  })
})

describe('timetables', () => {
  const overlaps = (slots: Slot[]) =>
    slots.some((slot, index) =>
      slots.some(
        (other, otherIndex) =>
          otherIndex > index &&
          other.day === slot.day &&
          toMinutes(other.start) < toMinutes(slot.end) &&
          toMinutes(slot.start) < toMinutes(other.end)
      )
    )

  it.each(everyone)('$name has no overlapping blocks', person => {
    expect(overlaps(person.timetable)).toBe(false)
  })

  it.each(everyone)('$name only attends courses they follow', person => {
    const taught = person.timetable
      .filter(slot => slot.kind === 'class')
      .map(slot => slot.title)
    for (const title of taught) expect(person.courses).toContain(title)
  })
})

describe('free time', () => {
  it('computes the gaps between busy blocks with a travel buffer', () => {
    const free = freeIntervals(
      [
        { start: toMinutes('10:00'), end: toMinutes('12:00') },
        { start: toMinutes('14:00'), end: toMinutes('16:00') },
      ],
      { start: toMinutes('08:00'), end: toMinutes('18:00') },
      60,
      15
    )

    expect(free).toEqual([
      { start: toMinutes('08:00'), end: toMinutes('09:45') },
      { start: toMinutes('12:15'), end: toMinutes('13:45') },
      { start: toMinutes('16:15'), end: toMinutes('18:00') },
    ])
  })

  it('reads the weekday from a date, Monday first', () => {
    expect(weekdayOf('2026-11-16')).toBe(1)
    expect(weekdayOf('2026-11-22')).toBe(7)
    expect(busyFromTimetable(demoMe.timetable, '2026-11-17')).toHaveLength(2)
  })
})
