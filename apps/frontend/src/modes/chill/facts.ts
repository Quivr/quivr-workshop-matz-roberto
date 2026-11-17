import type { Message } from '@ag-ui/core'

/**
 * What the bar knows about the student: only what tool results said, parsed
 * defensively. Nothing here is ever guessed or filled in.
 */
export type ScheduleItem = {
  title: string
  /** ISO 8601 with the Brussels offset, as the tool returns it. */
  start: string
  end: string
  location: string | null
}

export type Classmate = {
  name: string
  isSameClass: boolean
  title: string
}

export type ClassSlot = ScheduleItem & { classmates: Classmate[] }

export type MenuFact = {
  restaurant: string
  /** YYYY-MM-DD, from the tool result. */
  date: string
  dish: string
  price: number
}

export type BarFacts = {
  /** null: the schedule was never fetched. []: fetched, and nothing came back. */
  schedule: ScheduleItem[] | null
  classmates: ClassSlot[]
  menu: MenuFact | null
}

export const NO_FACTS: BarFacts = { schedule: null, classmates: [], menu: null }

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

/** YYYY-MM-DD as written in the ISO string (already Brussels time). */
export const dayOf = (iso: string) => iso.slice(0, 10)
/** HH:MM as written in the ISO string. */
export const timeOf = (iso: string) => iso.slice(11, 16)
/** Weekday of the calendar date in the string: no clock involved. */
export const weekdayOf = (iso: string) =>
  WEEKDAYS[new Date(`${dayOf(iso)}T00:00:00Z`).getUTCDay()] ?? ''
export const minutesBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 60_000)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

const parseItem = (value: unknown): ScheduleItem | null => {
  if (!isRecord(value)) return null
  const [title, start, end] = [value.title, value.start, value.end].map(text)
  if (!title || !start || !end || !ISO.test(start) || !ISO.test(end)) {
    return null
  }
  return { title, start, end, location: text(value.location) }
}

const parseSlot = (value: unknown): ClassSlot | null => {
  const item = parseItem(value)
  if (!item || !isRecord(value)) return null
  const mates = Array.isArray(value.classmates) ? value.classmates : []
  return {
    ...item,
    classmates: mates.flatMap(mate => {
      if (!isRecord(mate)) return []
      const name = text(mate.name)
      return name
        ? [
            {
              name,
              isSameClass: mate.isSameClass === true,
              title: text(mate.title) ?? '',
            },
          ]
        : []
    }),
  }
}

const parseMenu = (value: unknown): MenuFact | null => {
  if (!isRecord(value) || !Array.isArray(value.dishes)) return null
  const [restaurant, date] = [value.restaurant, value.date].map(text)
  if (!restaurant || !date) return null
  for (const dish of value.dishes) {
    if (!isRecord(dish) || dish.category !== 'WARM_BUFFET') continue
    const name = text(dish.name)
    const price = Array.isArray(dish.prices) ? dish.prices[0] : undefined
    if (name && typeof price === 'number' && price > 0) {
      return { restaurant, date, dish: name, price }
    }
  }
  return null
}

const toolResults = (messages: Message[]) => {
  const names = new Map<string, string>()
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const call of message.toolCalls ?? []) {
      names.set(call.id, call.function.name)
    }
  }
  return messages.flatMap(message => {
    if (message.role !== 'tool' || typeof message.content !== 'string') {
      return []
    }
    const name = names.get(message.toolCallId)
    if (!name || message.content.startsWith('Error')) return []
    try {
      return [{ name, result: JSON.parse(message.content) as unknown }]
    } catch {
      return []
    }
  })
}

/** Reads the facts out of the tool results of a run. Failed or odd results are skipped. */
export function parseBarFacts(messages: Message[]): BarFacts {
  const results = toolResults(messages)
  const schedules = results.filter(r => r.name === 'get_my_schedule')
  const items = schedules
    .flatMap(r => (Array.isArray(r.result) ? r.result : []))
    .flatMap(item => parseItem(item) ?? [])
    .sort((a, b) => a.start.localeCompare(b.start))

  const classmates = results
    .filter(r => r.name === 'get_classmates' && isRecord(r.result))
    .flatMap(r => {
      const classes = isRecord(r.result) ? r.result.classes : undefined
      return Array.isArray(classes)
        ? classes.flatMap(c => parseSlot(c) ?? [])
        : []
    })

  const menu =
    results
      .filter(r => r.name === 'get_menu')
      .map(r => parseMenu(r.result))
      .find(Boolean) ?? null

  return {
    schedule: schedules.length > 0 ? items : null,
    classmates,
    menu,
  }
}
