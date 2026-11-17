import { describe, expect, it } from 'vitest'

import type { QuivrClient } from '../quivr/quivr-client.js'
import { getClassmates } from './get-classmates.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { getStudentCard } from './get-student-card.js'

const fakeQuivr = (overrides: Partial<QuivrClient>) =>
  overrides as unknown as QuivrClient

describe('get_my_schedule', () => {
  it('merges days, sorts by start and keeps the useful fields', async () => {
    const days: Record<string, object[]> = {
      '2026-11-13': [
        {
          __typename: 'Lesson',
          title: 'Databases',
          startTime: '2026-11-13T14:00:00+01:00',
          endTime: '2026-11-13T16:00:00+01:00',
          locations: [{ name: 'V1.12' }],
          teachers: [{ name: 'Teacher' }],
        },
        {
          __typename: 'Event',
          title: 'Sports',
          startTime: '2026-11-13T08:00:00+01:00',
          endTime: '2026-11-13T09:00:00+01:00',
          locations: [],
        },
      ],
      '2026-11-14': [],
    }
    const quivr = fakeQuivr({
      getMySchedule: async (date: string) =>
        ({ scheduleItems: { scheduleItems: days[date] ?? [] } }) as never,
    })

    const result = await getMySchedule.run(
      { from: '2026-11-13', to: '2026-11-14' },
      quivr
    )

    expect(result).toEqual([
      expect.objectContaining({ kind: 'event', title: 'Sports' }),
      expect.objectContaining({
        kind: 'class',
        title: 'Databases',
        location: 'V1.12',
        teachers: ['Teacher'],
      }),
    ])
  })

  it('refuses ranges longer than two weeks', async () => {
    await expect(
      getMySchedule.run({ from: '2026-11-01', to: '2026-12-01' }, fakeQuivr({}))
    ).rejects.toThrow(/at most 14 days/)
  })
})

describe('get_menu', () => {
  it('flattens opening hours and dishes', async () => {
    const quivr = fakeQuivr({
      getMenu: async () =>
        ({
          restaurants: [
            {
              id: '3',
              name: 'Alma 2',
              openingHours: [
                { day: 'x', data: [{ openFrom: '11:30', openUntil: '14:00' }] },
              ],
              dishes: [
                {
                  name: 'Lasagne',
                  mealCategory: 'WARM_BUFFET',
                  prices: [4.6],
                  vegetarian: true,
                  vegan: false,
                  allergens: [],
                },
              ],
            },
          ],
        }) as never,
    })

    const result = await getMenu.run(
      { restaurantId: '3', date: '2026-11-13' },
      quivr
    )

    expect(result).toMatchObject({
      restaurant: 'Alma 2',
      openingHours: ['11:30-14:00'],
      dishes: [{ name: 'Lasagne', vegetarian: true }],
    })
  })

  it('marks vegan dishes as vegetarian and trims names', async () => {
    const quivr = fakeQuivr({
      getMenu: async () =>
        ({
          restaurants: [
            {
              id: '3',
              name: 'Alma 2',
              openingHours: [],
              dishes: [
                {
                  name: 'Spaghetti bolognese. ',
                  mealCategory: 'WARM_BUFFET',
                  prices: [6.35],
                  vegetarian: false,
                  vegan: true,
                  allergens: [],
                },
              ],
            },
          ],
        }) as never,
    })

    const result = await getMenu.run(
      { restaurantId: '3', date: '2026-11-13' },
      quivr
    )

    expect(result).toMatchObject({
      dishes: [{ name: 'Spaghetti bolognese', vegetarian: true, vegan: true }],
    })
  })
})

describe('get_library_occupancy', () => {
  it('computes how full each library is', async () => {
    const quivr = fakeQuivr({
      getLibraries: async () =>
        ({
          libraries: [
            {
              id: '1',
              name: 'Agora',
              data: { occupancy: 150, capacity: 600, timestamp: 't' },
              location: null,
            },
            { id: '2', name: 'No sensor', data: null, location: null },
          ],
        }) as never,
    })

    const result = await getLibraryOccupancy.run({}, quivr)

    expect(result).toEqual([
      expect.objectContaining({ name: 'Agora', percentFull: 25 }),
      expect.objectContaining({ name: 'No sensor', percentFull: undefined }),
    ])
  })
})

describe('get_student_card', () => {
  it('returns the signed-in student identity with a full name', async () => {
    const quivr = fakeQuivr({
      getStudentCard: async () =>
        ({
          user: {
            id: '1001',
            firstName: 'Alex',
            lastName: 'Student',
            email: 'alex.student@example.com',
          },
        }) as never,
    })

    const result = await getStudentCard.run({}, quivr)

    expect(result).toEqual({
      id: '1001',
      firstName: 'Alex',
      lastName: 'Student',
      name: 'Alex Student',
      email: 'alex.student@example.com',
    })
  })

  it('fails when nobody is signed in', async () => {
    const quivr = fakeQuivr({ getStudentCard: async () => ({ user: null }) })

    await expect(getStudentCard.run({}, quivr)).rejects.toThrow(/Not signed in/)
  })
})

describe('get_menu favourites', () => {
  it('keeps the favorite flag of every dish', async () => {
    const quivr = fakeQuivr({
      getMenu: async () =>
        ({
          restaurants: [
            {
              id: '3',
              name: 'Alma 2',
              openingHours: [],
              dishes: [
                {
                  name: 'Spaghetti meatballs',
                  mealCategory: 'WARM_BUFFET',
                  prices: [6.35],
                  vegetarian: false,
                  vegan: false,
                  allergens: [],
                  favorite: true,
                },
                {
                  name: 'Broccoli soup (S)',
                  mealCategory: 'SOUP',
                  prices: [1.1],
                  vegetarian: true,
                  vegan: false,
                  allergens: [],
                  favorite: false,
                },
              ],
            },
          ],
        }) as never,
    })

    const result = await getMenu.run(
      { restaurantId: '3', date: '2026-11-17' },
      quivr
    )

    expect(result).toMatchObject({
      dishes: [
        { name: 'Spaghetti meatballs', favorite: true },
        { name: 'Broccoli soup (S)', favorite: false },
      ],
    })
  })
})

describe('get_classmates', () => {
  const at = (hm: string) => `2026-11-17T${hm}:00+01:00`
  const mine = (title: string, from: string, to: string, place?: string) => ({
    __typename: 'Lesson',
    id: title,
    title,
    startTime: at(from),
    endTime: at(to),
    locations: place ? [{ name: place }] : [],
  })
  const theirs = (title: string, from: string, to: string, place?: string) => ({
    id: title,
    title,
    startTime: at(from),
    endTime: at(to),
    allDay: false,
    locations: place ? [{ name: place }] : [],
  })
  const friend = (id: string, firstName: string, lastName: string) => ({
    id,
    firstName,
    lastName,
  })

  const setup = (
    own: object[],
    friends: ReturnType<typeof friend>[],
    shared: Record<string, object[]>
  ) =>
    fakeQuivr({
      getMySchedule: async () =>
        ({ scheduleItems: { scheduleItems: own } }) as never,
      getFriends: async () => ({ friendList: friends }) as never,
      getFriendSchedules: async (ids: string[]) =>
        ({
          friendSchedules: ids.map(id => ({
            friendId: id,
            scheduleItems: shared[id] ?? [],
          })),
        }) as never,
    })

  it('reports an overlapping friend with the contract fields', async () => {
    const quivr = setup(
      [mine('Databases', '09:00', '11:00', 'V1.12')],
      [friend('1', 'Lotte', 'Voorbeeld')],
      { '1': [theirs('Chess club', '10:00', '12:00', 'Hall')] }
    )

    const result = await getClassmates.run({ date: '2026-11-17' }, quivr)

    expect(result).toEqual({
      date: '2026-11-17',
      friendsChecked: 1,
      classes: [
        {
          title: 'Databases',
          start: at('09:00'),
          end: at('11:00'),
          location: 'V1.12',
          classmates: [
            {
              id: '1',
              name: 'Lotte Voorbeeld',
              isSameClass: false,
              title: 'Chess club',
              start: at('10:00'),
              end: at('12:00'),
              location: 'Hall',
            },
          ],
        },
      ],
    })
  })

  it('flags a same-title overlap as the same class', async () => {
    const quivr = setup(
      [mine('Databases', '09:00', '11:00', 'V1.12')],
      [friend('1', 'Lotte', 'Voorbeeld'), friend('2', 'Max', 'Mockdata')],
      {
        '1': [theirs('databases ', '09:00', '11:00', 'v1.12')],
        '2': [theirs('Databases', '10:00', '12:00', 'V1.14')],
      }
    )

    const result = (await getClassmates.run({ date: '2026-11-17' }, quivr)) as {
      classes: { classmates: { id: string; isSameClass: boolean }[] }[]
    }

    expect(result.classes[0]?.classmates).toEqual([
      expect.objectContaining({ id: '1', isSameClass: true }),
      expect.objectContaining({ id: '2', isSameClass: false }),
    ])
  })

  it('treats an unknown location as compatible with a matching title', async () => {
    const quivr = setup(
      [mine('Databases', '09:00', '11:00', 'V1.12')],
      [friend('1', 'Lotte', 'Voorbeeld')],
      { '1': [theirs('Databases', '09:00', '11:00')] }
    )

    const result = (await getClassmates.run({ date: '2026-11-17' }, quivr)) as {
      classes: { classmates: { isSameClass: boolean }[] }[]
    }

    expect(result.classes[0]?.classmates[0]?.isSameClass).toBe(true)
  })

  it('does not match items that only touch end to start', async () => {
    const quivr = setup(
      [mine('Databases', '09:00', '11:00')],
      [friend('1', 'Lotte', 'Voorbeeld')],
      {
        '1': [
          theirs('Before', '08:00', '09:00'),
          theirs('After', '11:00', '12:00'),
        ],
      }
    )

    const result = (await getClassmates.run({ date: '2026-11-17' }, quivr)) as {
      friendsChecked: number
      classes: { classmates: unknown[] }[]
    }

    expect(result.classes[0]?.classmates).toEqual([])
    expect(result.friendsChecked).toBe(1)
  })

  it('keeps a class nobody shares, in start order', async () => {
    const quivr = setup(
      [mine('Afternoon', '14:00', '15:00'), mine('Morning', '09:00', '10:00')],
      [friend('1', 'Lotte', 'Voorbeeld')],
      { '1': [theirs('Afternoon', '14:30', '15:30')] }
    )

    const result = (await getClassmates.run({ date: '2026-11-17' }, quivr)) as {
      classes: { title: string; classmates: unknown[] }[]
    }

    expect(result.classes.map(c => [c.title, c.classmates.length])).toEqual([
      ['Morning', 0],
      ['Afternoon', 1],
    ])
  })

  it('ignores friends who share nothing', async () => {
    const quivr = setup(
      [mine('Databases', '09:00', '11:00')],
      [friend('1', 'Lotte', 'Voorbeeld'), friend('2', 'Nina', 'Nepnaam')],
      { '1': [theirs('Databases', '09:00', '11:00')] }
    )

    const result = (await getClassmates.run({ date: '2026-11-17' }, quivr)) as {
      friendsChecked: number
      classes: { classmates: unknown[] }[]
    }

    expect(result.friendsChecked).toBe(1)
    expect(result.classes[0]?.classmates).toHaveLength(1)
  })

  it('reports no friends checked when nobody shares or has friends', async () => {
    const quivr = fakeQuivr({
      getMySchedule: async () =>
        ({
          scheduleItems: {
            scheduleItems: [mine('Databases', '09:00', '11:00')],
          },
        }) as never,
      getFriends: async () => ({ friendList: [] }) as never,
    })

    const result = await getClassmates.run({ date: '2026-11-17' }, quivr)

    expect(result).toMatchObject({
      friendsChecked: 0,
      classes: [{ title: 'Databases', classmates: [] }],
    })
  })

  it('ignores all-day items and keeps one entry per friend', async () => {
    const quivr = setup(
      [mine('Databases', '09:00', '11:00')],
      [friend('1', 'Lotte', 'Voorbeeld')],
      {
        '1': [
          { ...theirs('Holiday', '00:00', '23:59'), allDay: true },
          theirs('Coffee', '09:00', '10:00'),
          theirs('Databases', '10:00', '11:00'),
        ],
      }
    )

    const result = (await getClassmates.run({ date: '2026-11-17' }, quivr)) as {
      classes: { classmates: { title: string }[] }[]
    }

    expect(result.classes[0]?.classmates.map(c => c.title)).toEqual([
      'Databases',
    ])
  })

  it('uses the full name and falls back to the first name without a last name', async () => {
    const quivr = setup(
      [mine('Databases', '09:00', '11:00')],
      [
        friend('1', ' Lotte ', ' Voorbeeld '),
        friend('2', 'Max', ''),
        friend('3', 'Nina', '   '),
        { id: '4', firstName: 'Jules', lastName: null } as never,
      ],
      {
        '1': [theirs('Databases', '09:00', '11:00')],
        '2': [theirs('Databases', '09:00', '11:00')],
        '3': [theirs('Databases', '09:00', '11:00')],
        '4': [theirs('Databases', '09:00', '11:00')],
      }
    )

    const result = (await getClassmates.run({ date: '2026-11-17' }, quivr)) as {
      classes: { classmates: { name: string }[] }[]
    }

    expect(result.classes[0]?.classmates.map(c => c.name)).toEqual([
      'Jules',
      'Lotte Voorbeeld',
      'Max',
      'Nina',
    ])
  })

  it('sorts same-class friends first, then by name', async () => {
    const quivr = setup(
      [mine('Databases', '09:00', '11:00', 'V1.12')],
      [
        friend('1', 'Anna', 'Voorbeeld'),
        friend('2', 'Zoë', 'Mockdata'),
        friend('3', 'Bram', 'Nepnaam'),
        friend('4', 'Max', 'Mockdata'),
      ],
      {
        '1': [theirs('Other', '09:00', '10:00')],
        '2': [theirs('Databases', '09:00', '11:00', 'V1.12')],
        '3': [theirs('Other', '10:00', '11:00')],
        '4': [theirs('Databases', '09:00', '11:00', 'V1.12')],
      }
    )

    const result = (await getClassmates.run({ date: '2026-11-17' }, quivr)) as {
      classes: { classmates: { name: string }[] }[]
    }

    expect(result.classes[0]?.classmates.map(c => c.name)).toEqual([
      'Max Mockdata',
      'Zoë Mockdata',
      'Anna Voorbeeld',
      'Bram Nepnaam',
    ])
  })
})
