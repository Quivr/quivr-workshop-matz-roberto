import { DEMO_NOTE } from '../demo/matching.js'
import { toMinutes, weekdayOf } from '../demo/schedule.js'
import { demoMe, students } from '../demo/students.js'
import { busynessAt, EVENTS, FAKBARS } from '../demo/world.js'
import { dateSchema, defineTool } from './define-tool.js'

const MAX_GOING = 3

export const getCampusEvents = defineTool({
  name: 'get_campus_events',
  description:
    "What is on in Leuven on one day: simulated student events (pub quiz, open mic, run club, ...) with the demo students who are going, and the simulated fakbars that are open with their expected crowd at 21:00 and 23:00. Flags events that match the logged-in student's interests. All data in this tool is simulated; say so.",
  inputSchema: {
    date: dateSchema.describe('Day, YYYY-MM-DD'),
  },
  run: async ({ date }) => {
    const day = weekdayOf(date)
    return {
      demo: true,
      note: DEMO_NOTE,
      date,
      events: EVENTS.filter(event => event.day === day)
        .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
        .map(event => ({
          title: event.title,
          start: event.start,
          end: event.end,
          where: event.where,
          area: event.area,
          matchesYourInterests: event.tags.some(tag =>
            demoMe.interests.includes(tag)
          ),
          going: students
            .filter(student =>
              event.tags.some(tag => student.interests.includes(tag))
            )
            .slice(0, MAX_GOING)
            .map(student => student.firstName),
        })),
      fakbars: FAKBARS.filter(bar => bar.openDays.includes(day)).map(bar => ({
        name: bar.name,
        area: bar.area,
        vibe: bar.vibe,
        crowdAt2100: busynessAt(bar, date, toMinutes('21:00')),
        crowdAt2300: busynessAt(bar, date, toMinutes('23:00')),
      })),
    }
  },
})
