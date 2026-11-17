import { addDays, dayRange } from '../src/quivr/dates.js'
import { fixtureKey } from '../src/quivr/fixtures.js'

const lesson = (
  id: string,
  title: string,
  date: string,
  from: string,
  to: string,
  place: string
) => {
  const offset = dayRange(date).startTime.slice(-6)
  return {
    __typename: 'Lesson',
    id,
    title,
    startTime: `${date}T${from}:00${offset}`,
    endTime: `${date}T${to}:00${offset}`,
    locations: [{ name: place, address: null }],
    teachers: [{ name: 'Prof. Voorbeeld' }],
  }
}

/**
 * Fictional lessons for the days after the recording day. Recorded schedules
 * are often empty, which would leave `get_classmates` with nothing to show.
 */
export const fictionalLessons = (recordingDay: string) => {
  const day = (offset: number) => addDays(recordingDay, offset)
  return {
    [day(1)]: [
      lesson('fictional-1', 'Databases', day(1), '09:00', '11:00', 'V1.12'),
      lesson(
        'fictional-2',
        'Web Development',
        day(1),
        '13:00',
        '15:00',
        'Aula B'
      ),
    ],
    [day(2)]: [
      lesson('fictional-3', 'Databases Lab', day(2), '10:00', '12:00', 'Lab 3'),
    ],
    [day(3)]: [
      lesson(
        'fictional-4',
        'Statistics',
        day(3),
        '14:00',
        '16:00',
        'Room 2.01'
      ),
    ],
  }
}

type DayEntry = { scheduleItems: { scheduleItems: unknown[] } }

/** Fills recorded `MySchedule` days that came back empty. Real days are never touched. */
export const fillEmptyDays = (
  entries: Record<string, unknown>,
  recordingDay: string
): Record<string, unknown> => {
  const filled = { ...entries }
  for (const [date, items] of Object.entries(fictionalLessons(recordingDay))) {
    const key = fixtureKey({ timeRange: dayRange(date) })
    const entry = filled[key] as DayEntry | undefined
    if (entry && entry.scheduleItems.scheduleItems.length === 0) {
      filled[key] = { scheduleItems: { scheduleItems: items } }
    }
  }
  return filled
}
