import {
  dayOf,
  minutesBetween,
  timeOf,
  weekdayOf,
  type BarFacts,
  type ScheduleItem,
} from './facts'
import type { GagLine } from './script'

/** A short chat among the regulars. Every number, name and title in `lines` comes from `BarFacts`. */
export type Exchange = { id: string; lines: GagLine[] }

const EARLY_BEFORE = '09:00'
const BIG_GAP_MIN = 180
const TIGHT_GAP_MIN = 20
const PACKED_DAY = 4
const FREE_AFTERNOON_FROM = '14:00'

const say = (speaker: GagLine['speaker'], text: string): GagLine => ({
  speaker,
  text,
})

const at = (item: ScheduleItem) =>
  `${item.title} on ${weekdayOf(item.start)} at ${timeOf(item.start)}`

const inPlace = (item: ScheduleItem) =>
  item.location ? ` In ${item.location}.` : ''

const byDay = (items: ScheduleItem[]) => {
  const days = new Map<string, ScheduleItem[]>()
  for (const item of items) {
    const day = dayOf(item.start)
    days.set(day, [...(days.get(day) ?? []), item])
  }
  return [...days.values()]
}

const pairs = (items: ScheduleItem[]) =>
  byDay(items).flatMap(day =>
    day
      .slice(1)
      .map((next, index) => [day[index] as ScheduleItem, next] as const)
  )

const duration = (minutes: number) => {
  const [hours, rest] = [Math.floor(minutes / 60), minutes % 60]
  return rest === 0 ? `${hours} hours` : `${hours} hours ${rest} minutes`
}

/** Bar talk that makes no claim about the student, the data or the world. */
export const NEUTRAL_EXCHANGES: Exchange[] = [
  {
    id: 'neutral-glass',
    lines: [
      say(
        'gus',
        'Sigh. Another glass polished, and not one of them says thank you.'
      ),
      say('bram', 'Anyway! Gus, my golden friend, you are a poet.'),
    ],
  },
  {
    id: 'neutral-stien',
    lines: [
      say('stien', '*hic* This is a beautiful bar, you know.'),
      say('pip', 'BUBBLES! …sorry. Reflex.'),
    ],
  },
  {
    id: 'neutral-lost',
    lines: [
      say('bram', 'Stien, my golden friend, what were we talking about?'),
      say('stien', '*hic* Something beautiful. I think.'),
    ],
  },
  {
    id: 'neutral-flavour',
    lines: [
      say('pip', 'What flavour is homework?'),
      say('gus', 'Bitter. Like everything that is not beer.'),
    ],
  },
]

/** Exchanges built from the fetched facts, best first, then the neutral ones. */
export function buildExchanges(facts: BarFacts): Exchange[] {
  const items = facts.schedule ?? []
  const out: Exchange[] = []

  const sameClass = facts.classmates.find(slot =>
    slot.classmates.some(mate => mate.isSameClass)
  )
  if (sameClass) {
    const names = sameClass.classmates
      .filter(mate => mate.isSameClass)
      .slice(0, 2)
      .map(mate => mate.name)
      .join(' and ')
    out.push({
      id: `classmates:${sameClass.start}`,
      lines: [
        say(
          'bram',
          `Anyway! ${names} ${names.includes(' and ') ? 'are' : 'is'} in ${sameClass.title} too, my golden friend. Ask for the notes!`
        ),
        say(
          'gus',
          'Sigh. Only friends who share their schedule, mind you. I cannot see the whole room.'
        ),
      ],
    })
  }
  const overlap = facts.classmates.find(
    slot =>
      !slot.classmates.some(mate => mate.isSameClass) &&
      slot.classmates.length > 0
  )
  const mate = overlap?.classmates[0]
  if (overlap && mate) {
    out.push({
      id: `overlap:${overlap.start}`,
      lines: [
        say(
          'pip',
          `${mate.name} has ${mate.title || 'something'} on at the same time as your ${overlap.title}. Fizzy coincidence!`
        ),
      ],
    })
  }

  const early = items.find(item => timeOf(item.start) < EARLY_BEFORE)
  if (early) {
    out.push({
      id: `early:${early.start}`,
      lines: [
        say(
          'gus',
          `Sigh. ${at(early)}.${inPlace(early)} Who schedules such cruelty?`
        ),
        say(
          'bram',
          'Anyway! Early lectures build character, my golden friend.'
        ),
      ],
    })
  }

  const gaps = pairs(items)
    .map(([a, b]) => ({ a, b, minutes: minutesBetween(a.end, b.start) }))
    .filter(gap => gap.minutes >= BIG_GAP_MIN)
    .sort((x, y) => y.minutes - x.minutes)
  const gap = gaps[0]
  if (gap) {
    out.push({
      id: `gap:${gap.a.end}`,
      lines: [
        say(
          'stien',
          `*hic* ${duration(gap.minutes)} between ${gap.a.title} and ${gap.b.title} on ${weekdayOf(gap.a.start)}. A beautiful, lonely gap.`
        ),
        say('pip', 'A gap that long? You could drink a whole soda in there!'),
        say('gus', 'Not here, you could not.'),
      ],
    })
  }

  const packed = byDay(items)
    .filter(day => day.length >= PACKED_DAY)
    .sort((x, y) => y.length - x.length)[0]
  if (packed && packed[0]) {
    out.push({
      id: `packed:${dayOf(packed[0].start)}`,
      lines: [
        say(
          'pip',
          `${weekdayOf(packed[0].start)} has ${packed.length} things on! That is ${packed.length} flavours of busy!`
        ),
        say('gus', 'Sigh. Pace yourself, kid. On the house.'),
      ],
    })
  }

  const tight = pairs(items).find(
    ([a, b]) =>
      a.location !== null &&
      b.location !== null &&
      a.location.toLowerCase() !== b.location.toLowerCase() &&
      minutesBetween(a.end, b.start) >= 0 &&
      minutesBetween(a.end, b.start) <= TIGHT_GAP_MIN
  )
  if (tight) {
    const [a, b] = tight
    out.push({
      id: `tight:${a.end}`,
      lines: [
        say(
          'gus',
          `${a.title} ends at ${timeOf(a.end)}, ${b.title} starts at ${timeOf(b.start)}, and one is in ${a.location} while the other is in ${b.location}. A sprint, kid.`
        ),
        say('bram', 'Anyway! Run, my golden friend, run!'),
      ],
    })
  }

  const free = byDay(items).find(day => {
    const last = day[day.length - 1]
    return last !== undefined && timeOf(last.end) <= FREE_AFTERNOON_FROM
  })
  const lastOfFree = free?.[free.length - 1]
  if (lastOfFree) {
    out.push({
      id: `free:${dayOf(lastOfFree.start)}`,
      lines: [
        say(
          'stien',
          `*hic* After ${lastOfFree.title} wraps up at ${timeOf(lastOfFree.end)} on ${weekdayOf(lastOfFree.start)}, nothing else is listed. An afternoon like a sunrise.`
        ),
        say('gus', 'Listed, kid. I said listed.'),
      ],
    })
  }

  const first = items[0]
  if (first) {
    out.push({
      id: `first:${first.start}`,
      lines: [
        say(
          'bram',
          `Anyway! First thing I can see is ${at(first)}.${inPlace(first)}`
        ),
        say('stien', '*hic* A beautiful thing, a timetable.'),
      ],
    })
  }

  const menu = facts.menu
  if (menu) {
    const before = items.find(
      item => dayOf(item.start) === menu.date && timeOf(item.start) >= '12:00'
    )
    out.push({
      id: `lunch:${menu.date}`,
      lines: [
        say(
          'gus',
          `Sigh. ${menu.restaurant} has ${menu.dish} for €${menu.price.toFixed(2)} on ${weekdayOf(`${menu.date}T00:00`)}${before ? `, before ${before.title} at ${timeOf(before.start)}` : ''}. Eat something real, kid.`
        ),
        say('pip', 'And a cola on the side?'),
        say('gus', 'Out.'),
      ],
    })
  }

  if (facts.schedule !== null && facts.schedule.length === 0) {
    out.push({
      id: 'empty',
      lines: [
        say(
          'gus',
          'Your schedule came back empty. A glorious stretch, or the machine is asleep. I take no position.'
        ),
        say('bram', 'Anyway! Do not quote us, my golden friend.'),
      ],
    })
  }

  return [...out, ...NEUTRAL_EXCHANGES]
}
