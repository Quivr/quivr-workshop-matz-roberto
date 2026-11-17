import { addDays, datesBetween } from '../quivr/dates.js'
import type { QuivrClient } from '../quivr/quivr-client.js'
import {
  busyFromItems,
  busyFromTimetable,
  freeIntervals,
  toHHMM,
  toMinutes,
  weekdayOf,
  type Interval,
} from './schedule.js'
import { demoMe, type DemoStudent } from './students.js'
import { LIBRARIES, RESTAURANTS } from './world.js'

export const DEMO_NOTE =
  'Profiles, fakbars, events and invite replies are fictional demo data. In fixture mode, your timetable is simulated too. Restaurants, menus and libraries come from recorded Quivr data.'

export type MyDay = { date: string; busy: Interval[]; classes: string[] }

/** My own schedule for `days` days, read through the normal Quivr client. */
export const loadMyWeek = async (
  quivr: QuivrClient,
  from: string,
  days: number
): Promise<MyDay[]> => {
  const dates = datesBetween(from, addDays(from, days - 1))
  const results = await Promise.all(
    dates.map(date => quivr.getMySchedule(date))
  )
  return dates.map((date, index) => {
    const items = results[index]?.scheduleItems.scheduleItems ?? []
    return {
      date,
      busy: busyFromItems(items, date),
      classes: items
        .filter(item => item.__typename === 'Lesson')
        .map(item => item.title),
    }
  })
}

const LUNCH: Interval = { start: toMinutes('11:30'), end: toMinutes('14:30') }
const EVENING: Interval = { start: toMinutes('17:30'), end: toMinutes('22:00') }

/** Shared free time at lunch and in the evening, 60 minutes or longer. */
export const socialSlots = (day: MyDay, student: DemoStudent) => {
  const busy = [...day.busy, ...busyFromTimetable(student.timetable, day.date)]
  return [LUNCH, EVENING].flatMap(window =>
    freeIntervals(busy, window, 60).map(gap => ({
      date: day.date,
      start: toHHMM(gap.start),
      end: toHHMM(gap.end),
    }))
  )
}

const normalise = (text: string) => text.trim().toLowerCase()

const intersect = (left: string[], right: string[]) =>
  left.filter(item => right.some(other => normalise(other) === normalise(item)))

const listOf = (items: string[], max = 2) =>
  items.length <= max
    ? items.join(' and ')
    : `${items.slice(0, max).join(', ')} and ${items.length - max} more`

/** A friendly heuristic: every point has a reason the assistant can quote. */
export const scoreMatch = (
  myCourses: string[],
  student: DemoStudent,
  lunchDays: number
): { score: number; reasons: string[] } => {
  const reasons: string[] = []
  let raw = 0

  const courses = intersect(student.courses, myCourses)
  if (courses.length) {
    raw += 3 * Math.min(3, courses.length)
    reasons.push(`Both follow ${listOf(courses)}`)
  }
  if (normalise(student.programme).startsWith(normalise(demoMe.programme))) {
    raw += 2
    reasons.push(`Both study ${demoMe.programme}`)
  }
  const dishes = intersect(student.favouriteDishes, demoMe.favouriteDishes)
  if (dishes.length) {
    raw += 1.5 * Math.min(2, dishes.length)
    reasons.push(`Both love ${listOf(dishes)}`)
  }
  if (student.favouriteLibraryId === demoMe.favouriteLibraryId) {
    raw += 1
    reasons.push(
      `Both study at ${LIBRARIES[demoMe.favouriteLibraryId]?.name ?? 'the same library'}`
    )
  }
  if (student.favouriteRestaurantId === demoMe.favouriteRestaurantId) {
    raw += 1
    reasons.push(
      `Both eat at ${RESTAURANTS[demoMe.favouriteRestaurantId]?.name ?? 'the same Alma'}`
    )
  }
  const interests = intersect(student.interests, demoMe.interests)
  if (interests.length) {
    raw += Math.min(3, interests.length)
    reasons.push(`Both into ${listOf(interests)}`)
  }
  if (student.mutualFriends > 0) {
    raw += Math.min(4, student.mutualFriends) * 0.5
    reasons.push(
      `${student.mutualFriends} mutual friend${student.mutualFriends === 1 ? '' : 's'}`
    )
  }
  if (lunchDays > 0) {
    raw += 2 * Math.min(3, lunchDays)
    reasons.push(
      `${lunchDays} shared lunch slot${lunchDays === 1 ? '' : 's'} this week`
    )
  }

  if (!reasons.length) reasons.push('Different worlds, same campus')
  return {
    score: Math.min(99, Math.round(35 + 65 * Math.min(1, raw / 28))),
    reasons,
  }
}

export const isWeekday = (date: string) => weekdayOf(date) <= 5
