export type Classmate = {
  id: string
  name: string
  isSameClass: boolean
  title: string
  start: string
  end: string
  location: string | null
}

export type ClassSlot = {
  title: string
  start: string
  end: string
  location: string | null
  classmates: Classmate[]
}

export type ClassmatesResult = {
  date: string
  friendsChecked: number | null
  classes: ClassSlot[]
}

const TIME_ZONE = 'Europe/Brussels'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const optStr = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

const parseClassmate = (value: unknown): Classmate | null => {
  if (!isRecord(value)) return null
  const name = str(value.name).trim()
  if (name === '') return null
  return {
    id: str(value.id, name),
    name,
    isSameClass: value.isSameClass === true,
    title: str(value.title),
    start: str(value.start),
    end: str(value.end),
    location: optStr(value.location),
  }
}

const parseClass = (value: unknown): ClassSlot | null => {
  if (!isRecord(value)) return null
  return {
    title: str(value.title, 'Untitled class'),
    start: str(value.start),
    end: str(value.end),
    location: optStr(value.location),
    classmates: Array.isArray(value.classmates)
      ? value.classmates.flatMap(c => parseClassmate(c) ?? [])
      : [],
  }
}

/** Defensive parse of the tool result: anything unusable gives `null`. */
export function parseClassmates(result: unknown): ClassmatesResult | null {
  if (!isRecord(result) || !Array.isArray(result.classes)) return null
  const friendsChecked = result.friendsChecked
  return {
    date: str(result.date),
    friendsChecked:
      typeof friendsChecked === 'number' && friendsChecked >= 0
        ? Math.floor(friendsChecked)
        : null,
    classes: result.classes.flatMap(c => parseClass(c) ?? []),
  }
}

const validDate = (iso: string): Date | null => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatTime = (iso: string): string => {
  const date = validDate(iso)
  if (!date) return '?'
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  })
}

export const formatRange = (start: string, end: string): string =>
  `${formatTime(start)}–${formatTime(end)}`

/** 'YYYY-MM-DD' → 'Tue 17 Nov'. Falls back to the raw string. */
export const formatDay = (date: string): string => {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? validDate(date) : null
  if (!parsed) return date
  return parsed.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** Same-class friends first, then alphabetical. Does not mutate the input. */
export const sortClassmates = (classmates: Classmate[]): Classmate[] =>
  [...classmates].sort(
    (a, b) =>
      Number(b.isSameClass) - Number(a.isSameClass) ||
      a.name.localeCompare(b.name)
  )

export const groupClassmates = (classmates: Classmate[]) => {
  const sorted = sortClassmates(classmates)
  return {
    sameClass: sorted.filter(c => c.isSameClass),
    busyElsewhere: sorted.filter(c => !c.isSameClass),
  }
}

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`
