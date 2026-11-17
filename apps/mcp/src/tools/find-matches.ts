import { z } from 'zod'

import {
  DEMO_NOTE,
  isWeekday,
  loadMyWeek,
  scoreMatch,
  socialSlots,
} from '../demo/matching.js'
import { demoMe, placeOf, students } from '../demo/students.js'
import { addDays } from '../quivr/dates.js'
import { dateSchema, defineTool } from './define-tool.js'

const MAX_RESULTS = 5
const WINDOW_DAYS = 7

export const findMatches = defineTool({
  name: 'find_matches',
  description:
    'Find students who are open to meeting someone, ranked by compatibility with the logged-in student. Compares the next 7 days of timetables (shared lunch and evening slots), courses, programme, favourite dishes and libraries, interests and mutual friends. Returns, per person: score (0-100), reasons (quote them to explain the score), profile, fun facts, an icebreaker, the place they usually hang out, and shared free slots. These are fictional demo profiles, not real Quivr users: always say so. Optional filters: name, gender, interest, programme. Follow up with find_shared_free_time or plan_date for one person.',
  inputSchema: {
    from: dateSchema.describe(
      'First day of the 7-day window to compare timetables, YYYY-MM-DD (usually today)'
    ),
    name: z.string().optional().describe('Only this first name, e.g. "Lotte"'),
    gender: z
      .enum(['woman', 'man', 'non-binary'])
      .optional()
      .describe('Only profiles with this gender'),
    interest: z
      .string()
      .optional()
      .describe('Only profiles with a matching interest, e.g. "climbing"'),
    programme: z
      .string()
      .optional()
      .describe('Only this programme or faculty, e.g. "psychology"'),
  },
  run: async ({ from, name, gender, interest, programme }, quivr) => {
    const week = await loadMyWeek(quivr, from, WINDOW_DAYS)
    const lessons = [...new Set(week.flatMap(day => day.classes))]
    const myCourses = lessons.length ? lessons : demoMe.courses

    const wantedName = name?.trim().toLowerCase()
    const wantedInterest = interest?.trim().toLowerCase()
    const wantedProgramme = programme?.trim().toLowerCase()

    const matches = students
      .filter(
        student => !wantedName || student.firstName.toLowerCase() === wantedName
      )
      .filter(student => !gender || student.gender === gender)
      .filter(
        student =>
          !wantedInterest ||
          student.interests.some(
            candidate =>
              candidate.includes(wantedInterest) ||
              wantedInterest.includes(candidate)
          )
      )
      .filter(
        student =>
          !wantedProgramme ||
          `${student.programme} ${student.courses.join(' ')}`
            .toLowerCase()
            .includes(wantedProgramme)
      )
      .map(student => {
        const slots = week.flatMap(day => socialSlots(day, student))
        const lunchDays = new Set(
          slots
            .filter(slot => isWeekday(slot.date) && slot.start < '14:30')
            .map(slot => slot.date)
        ).size
        const { score, reasons } = scoreMatch(myCourses, student, lunchDays)
        return {
          id: student.id,
          firstName: student.firstName,
          age: student.age,
          gender: student.gender,
          lookingFor: student.lookingFor,
          programme: student.programme,
          year: student.year,
          score,
          reasons,
          interests: student.interests,
          bio: student.bio,
          icebreaker: student.icebreaker,
          vibe: student.vibe,
          funFacts: student.funFacts,
          spot: placeOf(student.usualSpot),
          sharedFreeSlots: slots.slice(0, 6),
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)

    return {
      demo: true,
      note: DEMO_NOTE,
      center: { area: demoMe.area, label: demoMe.areaLabel },
      window: { from, to: addDays(from, WINDOW_DAYS - 1) },
      me: { programme: demoMe.programme, courses: myCourses },
      matches,
    }
  },
})
