import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { FIXTURES_DIR } from '../src/config.js'
import { demoMe } from '../src/demo/students.js'
import { weekdayOf } from '../src/demo/schedule.js'
import { dayRange } from '../src/quivr/dates.js'
import { fixtureKey } from '../src/quivr/fixtures.js'

type Entries = Record<string, { scheduleItems: { scheduleItems: unknown[] } }>

/**
 * Writes the fictional student's timetable into `fixtures/MySchedule.json`,
 * for every recorded day without lessons. The recorded account has none, and
 * `just record-fixtures` runs this again at the end.
 */
export const fakeMySchedule = () => {
  const file = join(FIXTURES_DIR, 'MySchedule.json')
  const meta = join(FIXTURES_DIR, 'meta.json')
  if (!existsSync(file) || !existsSync(meta)) return 0

  const { days } = JSON.parse(readFileSync(meta, 'utf8')) as { days: string[] }
  const entries = JSON.parse(readFileSync(file, 'utf8')) as Entries
  let added = 0

  for (const date of days) {
    const range = dayRange(date)
    const key = fixtureKey({ timeRange: range })
    const entry = entries[key]
    if (!entry || entry.scheduleItems.scheduleItems.length > 0) continue

    const offset = range.startTime.slice(-6)
    entry.scheduleItems.scheduleItems = demoMe.timetable
      .filter(slot => slot.day === weekdayOf(date))
      .map((slot, index) => ({
        __typename: 'Lesson',
        id: `demo-${date}-${index}`,
        title: slot.title,
        startTime: `${date}T${slot.start}:00${offset}`,
        endTime: `${date}T${slot.end}:00${offset}`,
        locations: slot.room ? [{ name: slot.room, address: null }] : [],
        teachers: slot.teacher ? [{ name: slot.teacher }] : [],
      }))
    added += entry.scheduleItems.scheduleItems.length
  }

  writeFileSync(file, `${JSON.stringify(entries, null, 2)}\n`)
  return added
}

if (process.argv[1]?.endsWith('fake-schedule.ts')) {
  console.info(`Added ${fakeMySchedule()} fictional lessons to MySchedule.json`)
}
