import { TIME_ZONE } from '../quivr/dates.js'

export type Day = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** A weekly recurring block. `class` blocks become lessons, `busy` blocks are everything else. */
export type Slot = {
  day: Day
  start: string
  end: string
  title: string
  kind: 'class' | 'busy'
  room?: string
  teacher?: string
}

/** Minutes since local midnight. */
export type Interval = { start: number; end: number }

export const DAY_WINDOW: Interval = { start: 8 * 60, end: 22 * 60 }
export const TRAVEL_BUFFER = 15

export const toMinutes = (hhmm: string): number => {
  const [hours = '0', minutes = '0'] = hhmm.split(':')
  return Number(hours) * 60 + Number(minutes)
}

export const toHHMM = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** Monday is 1, Sunday is 7. */
export const weekdayOf = (date: string): Day => {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  return (day === 0 ? 7 : day) as Day
}

export const localTime = (iso: string): { date: string; minutes: number } => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map(part => [part.type, part.value])
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour ?? 0) * 60 + Number(parts.minute ?? 0),
  }
}

/** Opening hours come as `HH:MM` or as an ISO timestamp, depending on the backend. */
export const clockMinutes = (value: string): number =>
  /^\d{1,2}:\d{2}$/.test(value) ? toMinutes(value) : localTime(value).minutes

export const busyFromItems = (
  items: { startTime: string; endTime: string }[],
  date: string
): Interval[] =>
  items
    .map(item => {
      const start = localTime(item.startTime)
      const end = localTime(item.endTime)
      return {
        start: start.date < date ? 0 : start.minutes,
        end: end.date > date ? 24 * 60 : end.minutes,
      }
    })
    .filter(interval => interval.end > interval.start)

export const busyFromTimetable = (
  timetable: Slot[],
  date: string
): Interval[] =>
  timetable
    .filter(slot => slot.day === weekdayOf(date))
    .map(slot => ({ start: toMinutes(slot.start), end: toMinutes(slot.end) }))

/** Gaps inside `window` that are not covered by `busy`, padded by `buffer` minutes around each block. */
export const freeIntervals = (
  busy: Interval[],
  window: Interval = DAY_WINDOW,
  minMinutes = 0,
  buffer = TRAVEL_BUFFER
): Interval[] => {
  const padded = busy
    .map(block => ({ start: block.start - buffer, end: block.end + buffer }))
    .sort((a, b) => a.start - b.start)
  const free: Interval[] = []
  let cursor = window.start
  for (const block of padded) {
    if (block.start > cursor) {
      free.push({ start: cursor, end: Math.min(block.start, window.end) })
    }
    cursor = Math.max(cursor, block.end)
    if (cursor >= window.end) break
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end })
  return free.filter(gap => gap.end - gap.start >= minMinutes)
}

export const describeInterval = (interval: Interval) => ({
  start: toHHMM(interval.start),
  end: toHHMM(interval.end),
  minutes: interval.end - interval.start,
})
