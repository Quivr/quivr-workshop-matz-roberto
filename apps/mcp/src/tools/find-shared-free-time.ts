import { z } from 'zod'

import { DEMO_NOTE, loadMyWeek } from '../demo/matching.js'
import {
  busyFromTimetable,
  DAY_WINDOW,
  describeInterval,
  freeIntervals,
} from '../demo/schedule.js'
import { findStudent } from '../demo/students.js'
import { dateSchema, defineTool } from './define-tool.js'

const MAX_DAYS = 7

export const findSharedFreeTime = defineTool({
  name: 'find_shared_free_time',
  description:
    'Find when the logged-in student and one demo student are both free between two dates (inclusive, max 7 days). Reads the real schedule of the logged-in student and the fictional timetable of the other person, leaves 15 minutes of travel time around classes, and only returns gaps between 08:00 and 22:00 that are long enough. Use it before suggesting a time to meet. The other person is a fictional demo profile.',
  inputSchema: {
    student: z
      .string()
      .describe('First name or id from find_matches, e.g. "Lotte"'),
    from: dateSchema.describe('First day, YYYY-MM-DD'),
    to: dateSchema.describe(
      'Last day, YYYY-MM-DD. Same as `from` for one day.'
    ),
    minMinutes: z
      .number()
      .int()
      .min(30)
      .max(300)
      .optional()
      .describe('Shortest gap to return, in minutes. Default 60.'),
  },
  run: async ({ student: query, from, to, minMinutes }, quivr) => {
    const student = findStudent(query)
    if (!student) throw new Error(`No demo student called "${query}"`)

    const first = new Date(`${from}T12:00:00Z`).getTime()
    const last = new Date(`${to}T12:00:00Z`).getTime()
    const days = Math.round((last - first) / 86_400_000) + 1
    if (days < 1) throw new Error('`to` must not be before `from`')
    if (days > MAX_DAYS)
      throw new Error(`Ask for at most ${MAX_DAYS} days at a time`)

    const week = await loadMyWeek(quivr, from, days)
    const slots = week.flatMap(day =>
      freeIntervals(
        [...day.busy, ...busyFromTimetable(student.timetable, day.date)],
        DAY_WINDOW,
        minMinutes ?? 60
      ).map(gap => ({ date: day.date, ...describeInterval(gap) }))
    )

    return {
      demo: true,
      note: DEMO_NOTE,
      student: { id: student.id, firstName: student.firstName },
      slots,
    }
  },
})
