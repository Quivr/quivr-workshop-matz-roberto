import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { FIXTURES_DIR } from '../src/config.js'
import { brusselsDate, dayRange } from '../src/quivr/dates.js'
import { fixtureKey } from '../src/quivr/fixtures.js'
import {
  FICTIONAL_FIRST_NAMES,
  FICTIONAL_FRIEND_ID,
  FICTIONAL_LAST_NAMES,
  FICTIONAL_PLACE,
  FICTIONAL_STUDENT,
  PRIVATE_EVENT_TITLES,
} from './anonymise.js'
import { fictionalLessons } from './fictional-lessons.js'

const read = <T>(name: string) =>
  JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf8')) as T

type Item = { __typename?: string; title: string; notes?: unknown }
type Day = { scheduleItems: { scheduleItems: Item[] } }

const entries = <T>(name: string) =>
  Object.entries(read<Record<string, T>>(name))

const mySchedule = entries<Day>('MySchedule')
const lessonTitles = new Set(
  mySchedule.flatMap(([, day]) =>
    day.scheduleItems.scheduleItems
      .filter(item => item.__typename === 'Lesson')
      .map(item => item.title)
  )
)
const lessonPlaces = new Set(
  mySchedule.flatMap(([, day]) =>
    day.scheduleItems.scheduleItems.flatMap(item =>
      ((item as { locations?: { name: string }[] }).locations ?? []).map(
        location => location.name
      )
    )
  )
)

describe('fixtures contain no un-anonymised data', () => {
  it('Me is the fictional student', () => {
    expect(entries<{ user: unknown }>('Me')).toEqual([
      ['{}', { user: FICTIONAL_STUDENT }],
    ])
  })

  const friendList = entries<{
    friendList: { id: string; firstName: string; lastName: string }[]
  }>('FriendList').flatMap(([, response]) => response.friendList)

  it('every friend is a fictional person', () => {
    expect(friendList.length).toBeGreaterThan(0)
    for (const friend of friendList) {
      expect(friend.id).toMatch(FICTIONAL_FRIEND_ID)
      expect(FICTIONAL_FIRST_NAMES).toContain(friend.firstName)
      expect(FICTIONAL_LAST_NAMES).toContain(friend.lastName)
    }
  })

  it('friend schedules only use fictional ids, public lessons or stand-in titles and places', () => {
    const ids = new Set(friendList.map(friend => friend.id))
    const schedules = entries<{
      friendSchedules: {
        friendId: string
        scheduleItems: {
          title: string
          locations: { name: string | null }[]
        }[]
      }[]
    }>('FriendSchedules')
    expect(schedules.length).toBeGreaterThan(0)

    for (const [key, response] of schedules) {
      const { friendIds } = JSON.parse(key) as { friendIds: string[] }
      for (const id of friendIds) expect(ids).toContain(id)

      for (const schedule of response.friendSchedules) {
        expect(ids).toContain(schedule.friendId)
        for (const item of schedule.scheduleItems) {
          expect([...lessonTitles, ...PRIVATE_EVENT_TITLES]).toContain(
            item.title
          )
          for (const { name } of item.locations) {
            if (name === null) continue
            expect(lessonPlaces.has(name) || FICTIONAL_PLACE.test(name)).toBe(
              true
            )
          }
        }
      }
    }
  })

  it('own schedule has no notes and only stand-in titles for non-lessons', () => {
    for (const [, day] of mySchedule) {
      for (const item of day.scheduleItems.scheduleItems) {
        expect(item.notes ?? null).toBeNull()
        if (item.__typename !== 'Lesson') {
          expect(PRIVATE_EVENT_TITLES).toContain(item.title)
        }
      }
    }
  })

  it('keeps the fictional lessons that get_classmates and its evals rely on', () => {
    const { recordedAt } = read<{ recordedAt: string }>('meta')
    const recordingDay = brusselsDate(new Date(recordedAt))
    const days = new Map(mySchedule)

    for (const date of Object.keys(fictionalLessons(recordingDay))) {
      const day = days.get(fixtureKey({ timeRange: dayRange(date) }))
      expect(day?.scheduleItems.scheduleItems.length).toBeGreaterThan(0)
    }
  })
})
