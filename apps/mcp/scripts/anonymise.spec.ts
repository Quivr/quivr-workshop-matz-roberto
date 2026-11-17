import { describe, expect, it } from 'vitest'

import { dayRange } from '../src/quivr/dates.js'
import { fixtureKey } from '../src/quivr/fixtures.js'
import {
  anonymise,
  createAnonymiser,
  FICTIONAL_FIRST_NAMES,
  FICTIONAL_LAST_NAMES,
  MAX_FIXTURE_FRIENDS,
} from './anonymise.js'
import { fictionalLessons, fillEmptyDays } from './fictional-lessons.js'

describe('anonymise', () => {
  it('replaces people, private event titles and notes but keeps lessons and places', () => {
    const data = {
      scheduleItems: {
        scheduleItems: [
          {
            __typename: 'Lesson',
            title: 'Machine Learning',
            notes: 'bring laptop',
            locations: [{ name: 'A.2.040' }],
            teachers: [{ name: 'Real Teacher' }],
          },
          {
            __typename: 'Event',
            title: "Birthday party at Jan's",
            notes: null,
          },
        ],
      },
      friendList: [
        { firstName: 'Real', lastName: 'Student', email: 'real@ugent.be' },
      ],
    }

    const result = anonymise(data) as typeof data
    const [lesson, event] = result.scheduleItems.scheduleItems

    expect(lesson?.title).toBe('Machine Learning')
    expect(lesson?.locations).toEqual([{ name: 'A.2.040' }])
    expect(lesson?.notes).toBeNull()
    expect(lesson?.teachers?.[0]?.name).not.toBe('Real Teacher')
    expect(event?.title).not.toContain('Jan')
    expect(result.friendList[0]).not.toMatchObject({ firstName: 'Real' })
    expect(result.friendList[0]?.email).not.toBe('real@ugent.be')
  })
})

describe('createAnonymiser', () => {
  const realFriends = [
    { id: '55501', firstName: 'Realfirst', lastName: 'Reallast' },
    { id: '55502', firstName: 'Other', lastName: 'Person' },
  ]
  const mySchedule = {
    scheduleItems: {
      scheduleItems: [
        {
          __typename: 'Lesson',
          title: 'Machine Learning',
          locations: [{ name: 'A.2.040' }],
        },
      ],
    },
  }
  const friendItem = (title: string, place: string | null) => ({
    id: '777',
    title,
    startTime: '2026-11-17T09:00:00+01:00',
    endTime: '2026-11-17T10:00:00+01:00',
    allDay: false,
    locations: place ? [{ name: place }] : [],
  })

  const setup = () => {
    const anonymiser = createAnonymiser()
    anonymiser.response('MySchedule', mySchedule)
    const list = anonymiser.response('FriendList', { friendList: realFriends })
    const schedules = anonymiser.response('FriendSchedules', {
      friendSchedules: [
        {
          friendId: '55502',
          scheduleItems: [
            friendItem('Machine Learning', 'A.2.040'),
            friendItem("Birthday at Jan's", "Jan's apartment"),
          ],
        },
      ],
    })
    return { anonymiser, list, schedules }
  }

  it('replaces friend ids and names with the same fictional person in both files', () => {
    const { anonymiser, list, schedules } = setup()
    const json = JSON.stringify([list, schedules])

    for (const real of ['55501', '55502', 'Realfirst', 'Reallast', 'Person']) {
      expect(json).not.toContain(real)
    }
    expect(list).toEqual({
      friendList: [
        { id: '9001', firstName: 'Lotte', lastName: 'Voorbeeld' },
        { id: '9002', firstName: 'Max', lastName: 'Mockdata' },
      ],
    })
    expect(schedules).toMatchObject({
      friendSchedules: [{ friendId: '9002' }],
    })
    expect(
      anonymiser.variables('FriendSchedules', {
        friendIds: ['55502', '55501'],
        timeRange: { startTime: 'a', endTime: 'b' },
      })
    ).toEqual({
      friendIds: ['9002', '9001'],
      timeRange: { startTime: 'a', endTime: 'b' },
    })
  })

  it('keeps lessons and rooms from the own schedule but scrubs private titles and places', () => {
    const { schedules } = setup()
    const items = (
      schedules as {
        friendSchedules: { scheduleItems: Record<string, unknown>[] }[]
      }
    ).friendSchedules[0]!.scheduleItems

    expect(items[0]).toMatchObject({
      title: 'Machine Learning',
      locations: [{ name: 'A.2.040' }],
    })
    expect(JSON.stringify(items[1])).not.toMatch(/Jan|apartment|Birthday/)
    expect(items[1]).toMatchObject({
      locations: [{ name: 'Fictional place 1' }],
    })
  })

  it('drops fields it does not know and caps the number of friends', () => {
    const anonymiser = createAnonymiser()
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `real-${i}`,
      firstName: 'Real',
      lastName: 'Person',
      email: 'real@ugent.be',
    }))

    const { friendList } = anonymiser.response('FriendList', {
      friendList: many,
    }) as { friendList: Record<string, string>[] }

    expect(friendList).toHaveLength(MAX_FIXTURE_FRIENDS)
    expect(Object.keys(friendList[0]!)).toEqual(['id', 'firstName', 'lastName'])
    for (const friend of friendList) {
      expect(FICTIONAL_FIRST_NAMES).toContain(friend.firstName)
      expect(FICTIONAL_LAST_NAMES).toContain(friend.lastName)
    }
  })
})

describe('fillEmptyDays', () => {
  const key = (date: string) => fixtureKey({ timeRange: dayRange(date) })
  const empty = { scheduleItems: { scheduleItems: [] } }

  it('fills empty days after the recording day with fictional lessons', () => {
    const [tomorrow] = Object.keys(fictionalLessons('2026-11-16'))
    const filled = fillEmptyDays({ [key(tomorrow!)]: empty }, '2026-11-16')

    expect(filled[key(tomorrow!)]).toEqual({
      scheduleItems: {
        scheduleItems: fictionalLessons('2026-11-16')[tomorrow!],
      },
    })
  })

  it('never replaces a day that has real items or was not recorded', () => {
    const [tomorrow] = Object.keys(fictionalLessons('2026-11-16'))
    const real = { scheduleItems: { scheduleItems: [{ title: 'Real' }] } }

    const filled = fillEmptyDays({ [key(tomorrow!)]: real }, '2026-11-16')

    expect(filled).toEqual({ [key(tomorrow!)]: real })
  })
})
