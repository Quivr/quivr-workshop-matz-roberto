import { z } from 'zod'

import { dateExtras } from '../demo/date-extras.js'
import { DEMO_NOTE, loadMyWeek } from '../demo/matching.js'
import {
  busyFromTimetable,
  clockMinutes,
  freeIntervals,
  toHHMM,
  toMinutes,
  weekdayOf,
  type Interval,
} from '../demo/schedule.js'
import { demoMe, findStudent, type DemoStudent } from '../demo/students.js'
import {
  busynessAt,
  EVENTS,
  FAKBARS,
  LIBRARIES,
  RESTAURANTS,
} from '../demo/world.js'
import type { QuivrClient } from '../quivr/quivr-client.js'
import { dateSchema, defineTool } from './define-tool.js'

const KINDS = {
  lunch: { window: ['11:30', '14:30'], minutes: 45, duration: 60 },
  dinner: { window: ['17:30', '20:30'], minutes: 60, duration: 90 },
  study: { window: ['09:00', '19:00'], minutes: 90, duration: 120 },
  drinks: { window: ['20:00', '23:59'], minutes: 90, duration: 120 },
} as const

type Kind = keyof typeof KINDS

const tidy = (name: string) =>
  name
    .trim()
    .replace(/[.,;]+$/, '')
    .toLowerCase()
const roundUp = (minutes: number) => Math.ceil(minutes / 15) * 15

const BUSYNESS_SCORE = { GREEN: 2, YELLOW: 1, RED: 0, CLOSED: -10 }

const planMeal = async (
  quivr: QuivrClient,
  student: DemoStudent,
  date: string,
  start: number,
  end: number,
  twist?: 'budget' | 'quiet' | 'chaos'
) => {
  const { restaurants } = await quivr.listRestaurants()
  const known = new Set(restaurants.map(restaurant => restaurant.id))
  const ids = [
    ...new Set([
      student.favouriteRestaurantId,
      demoMe.favouriteRestaurantId,
      ...Object.keys(RESTAURANTS),
    ]),
  ]
    .filter(id => known.has(id))
    .slice(0, 6)

  const menus = await Promise.all(ids.map(id => quivr.getMenu(id, date)))
  const mine = new Set(demoMe.favouriteDishes.map(tidy))
  const theirs = new Set(student.favouriteDishes.map(tidy))

  const options = menus.flatMap(menu => {
    const restaurant = menu.restaurants[0]
    if (!restaurant) return []

    const open = restaurant.openingHours
      .flatMap(day => day.data)
      .some(
        slot =>
          clockMinutes(slot.openFrom) <= start &&
          clockMinutes(slot.openUntil) >= end
      )
    if (!open) return []

    const dishes = restaurant.dishes.map(dish => ({
      name: dish.name.trim().replace(/[.,;]+$/, ''),
      price: dish.prices[0],
      vegetarian: dish.vegetarian || dish.vegan,
      vegan: dish.vegan,
      category: dish.mealCategory,
    }))
    const fitsDiet = (dish: (typeof dishes)[number]) =>
      !student.diet || (student.diet === 'vegan' ? dish.vegan : dish.vegetarian)
    if (student.diet && !dishes.some(fitsDiet)) return []
    const warm = dishes.filter(
      dish => dish.category === 'WARM_BUFFET' && fitsDiet(dish)
    )
    const priced = warm
      .filter(
        (dish): dish is typeof dish & { price: number } =>
          typeof dish.price === 'number'
      )
      .sort((a, b) => a.price - b.price)
    const budgetPick = priced[0]

    const loved = dishes
      .filter(fitsDiet)
      .filter(dish => mine.has(tidy(dish.name)) || theirs.has(tidy(dish.name)))
      .map(dish => ({
        ...dish,
        lovedBy:
          mine.has(tidy(dish.name)) && theirs.has(tidy(dish.name))
            ? 'both of you'
            : theirs.has(tidy(dish.name))
              ? student.firstName
              : 'you',
      }))
    const both = loved.filter(dish => dish.lovedBy === 'both of you').length
    const score =
      3 * both +
      (loved.length - both) +
      (restaurant.id === student.favouriteRestaurantId ? 1 : 0) +
      (restaurant.id === demoMe.favouriteRestaurantId ? 1 : 0) +
      (RESTAURANTS[restaurant.id]?.area === demoMe.area ? 2.5 : 0)

    const fillers = dishes
      .filter(dish => dish.category === 'WARM_BUFFET' && fitsDiet(dish))
      .filter(dish => !loved.some(item => item.name === dish.name))
      .slice(0, Math.max(0, 3 - loved.length))

    return [{ restaurant, score, loved, fillers, budgetPick }]
  })

  const best = options.sort((a, b) =>
    twist === 'budget'
      ? (a.budgetPick?.price ?? Infinity) - (b.budgetPick?.price ?? Infinity) ||
        b.score - a.score
      : b.score - a.score
  )[0]
  if (!best) return undefined

  const place = RESTAURANTS[best.restaurant.id]
  const why = [
    ...best.loved.map(dish =>
      dish.lovedBy === 'both of you'
        ? `${dish.name} is on the menu and you both love it`
        : `${dish.name} is on the menu (${dish.lovedBy === 'you' ? 'your' : `${student.firstName}'s`} favourite)`
    ),
    ...(best.restaurant.id === student.favouriteRestaurantId
      ? [`${best.restaurant.name} is ${student.firstName}'s usual spot`]
      : []),
    ...(student.diet ? [`Has ${student.diet} options`] : []),
    ...(twist === 'budget' && best.budgetPick
      ? [`A warm meal starts at €${best.budgetPick.price.toFixed(2)} here`]
      : []),
  ]
  const featured =
    twist === 'budget' && best.budgetPick
      ? [best.budgetPick, ...best.loved, ...best.fillers]
      : [...best.loved, ...best.fillers]
  return {
    venue: {
      id: best.restaurant.id,
      name: best.restaurant.name,
      kind: 'restaurant' as const,
      area: place?.area ?? 'centrum',
    },
    highlights: featured
      .filter(
        (dish, index, all) =>
          all.findIndex(other => other.name === dish.name) === index
      )
      .slice(0, 4)
      .map(dish => ({
        name: dish.name,
        priceEur: dish.price,
        vegetarian: dish.vegetarian,
        vegan: dish.vegan,
      })),
    why,
    alternatives: options
      .filter(option => option.restaurant.id !== best.restaurant.id)
      .slice(0, 2)
      .map(option => option.restaurant.name),
  }
}

const planStudy = async (
  quivr: QuivrClient,
  student: DemoStudent,
  twist?: 'budget' | 'quiet' | 'chaos'
) => {
  const { libraries } = await quivr.getLibraries()
  const options = libraries
    .filter(library => library.data && library.data.capacity >= 50)
    .map(library => {
      const percentFull = Math.round(
        (library.data!.occupancy / library.data!.capacity) * 100
      )
      const bonus =
        (library.id === student.favouriteLibraryId ? 15 : 0) +
        (library.id === demoMe.favouriteLibraryId ? 15 : 0)
      return {
        library,
        percentFull,
        score: (twist === 'quiet' ? 0 : bonus) - percentFull,
      }
    })
    .sort((a, b) => b.score - a.score)
  const best = options[0]
  if (!best) return undefined

  const why = [
    `${best.library.name} was ${best.percentFull}% full at the latest recorded reading`,
    ...(best.library.id === student.favouriteLibraryId
      ? [`It is ${student.firstName}'s favourite library`]
      : []),
    ...(best.library.id === demoMe.favouriteLibraryId
      ? ['It is also your favourite library']
      : []),
    ...(twist === 'quiet'
      ? ['Picked for the lowest occupancy in the latest recorded reading']
      : []),
  ]
  return {
    venue: {
      id: best.library.id,
      name: best.library.name,
      kind: 'library' as const,
      area: LIBRARIES[best.library.id]?.area ?? 'centrum',
      percentFull: best.percentFull,
    },
    highlights: [],
    why,
    alternatives: options.slice(1, 3).map(option => option.library.name),
    caveat:
      'Occupancy is a snapshot, not a forecast for that day. Library opening hours were not checked.',
  }
}

const planDrinks = (
  student: DemoStudent,
  date: string,
  start: number,
  end: number,
  twist?: 'budget' | 'quiet' | 'chaos'
) => {
  const day = weekdayOf(date)
  const bars = FAKBARS.map(bar => ({
    bar,
    busyness: busynessAt(bar, date, start),
    score:
      (twist === 'chaos'
        ? 2 - BUSYNESS_SCORE[busynessAt(bar, date, start)]
        : BUSYNESS_SCORE[busynessAt(bar, date, start)]) +
      (twist !== 'chaos' && bar.id === student.favouriteFakbarId ? 2 : 0),
  }))
    .filter(option => option.busyness !== 'CLOSED')
    .sort((a, b) => b.score - a.score)

  const events = EVENTS.filter(
    event =>
      event.day === day &&
      toMinutes(event.start) < end &&
      toMinutes(event.end) > start
  ).map(event => ({
    event,
    shared: event.tags.filter(
      tag => student.interests.includes(tag) && demoMe.interests.includes(tag)
    ),
  }))
  const event = events.sort((a, b) => b.shared.length - a.shared.length)[0]
  const best = bars[0]
  if (!best && !event) return undefined

  const why = [
    ...(best
      ? [
          `${best.bar.name} should be ${best.busyness === 'GREEN' ? 'quiet' : best.busyness === 'YELLOW' ? 'lively' : 'packed'} at ${toHHMM(start)}: ${best.bar.vibe}`,
          ...(best.bar.id === student.favouriteFakbarId
            ? [`It is ${student.firstName}'s favourite fakbar`]
            : []),
        ]
      : []),
    ...(event
      ? [
          `${event.event.title} at ${event.event.where} (${event.event.start} to ${event.event.end})${event.shared.length ? `, you both like ${event.shared.join(' and ')}` : ''}`,
        ]
      : []),
  ]
  return {
    venue: best
      ? {
          id: best.bar.id,
          name: best.bar.name,
          kind: 'fakbar' as const,
          area: best.bar.area,
          expectedCrowd: best.busyness,
        }
      : {
          id: event!.event.id,
          name: event!.event.where,
          kind: 'event' as const,
          area: event!.event.area,
        },
    highlights: [],
    why,
    alternatives: bars.slice(1, 3).map(option => option.bar.name),
  }
}

export const planDate = defineTool({
  name: 'plan_date',
  description:
    'Plan a first meet-up with one demo student on one day. kind: lunch, dinner (real restaurant opening hours and menus: favourite dishes both of you love, diets respected), study (latest recorded library occupancy, not a forecast or opening-hours check) or drinks (simulated fakbars with expected crowd, and simulated campus events). Optional plot twist: budget for the cheapest warm meal, quiet for the least occupied library in the latest reading, chaos for a lively fakbar. Finds a shared free time, then returns a venue, a three-step meet-cute mission and three invite drafts. The person, fakbars and events are simulated; restaurants, menus and libraries are recorded Quivr data. Drafts are suggestions only: show the exact draft and wait for explicit confirmation before calling send_date_invite. This tool sends nothing.',
  inputSchema: {
    student: z
      .string()
      .describe('First name or id from find_matches, e.g. "Lotte"'),
    date: dateSchema.describe('Day, YYYY-MM-DD'),
    kind: z
      .enum(['lunch', 'dinner', 'study', 'drinks'])
      .describe('Type of meet-up'),
    twist: z
      .enum(['budget', 'quiet', 'chaos'])
      .optional()
      .describe(
        'Optional reroll: budget with lunch/dinner, quiet with study, chaos with drinks'
      ),
  },
  run: async ({ student: query, date, kind, twist }, quivr) => {
    const student = findStudent(query)
    if (!student) throw new Error(`No demo student called "${query}"`)
    if (
      (twist === 'budget' && kind !== 'lunch' && kind !== 'dinner') ||
      (twist === 'quiet' && kind !== 'study') ||
      (twist === 'chaos' && kind !== 'drinks')
    ) {
      throw new Error(`The ${twist} plot twist does not fit a ${kind} date`)
    }
    const config = KINDS[kind as Kind]
    const window: Interval = {
      start: toMinutes(config.window[0]),
      end: toMinutes(config.window[1]),
    }

    const [day] = await loadMyWeek(quivr, date, 1)
    const free = freeIntervals(
      [...(day?.busy ?? []), ...busyFromTimetable(student.timetable, date)],
      window,
      config.minutes
    )
    const gap = free[0]
    const base = {
      demo: true,
      note: DEMO_NOTE,
      student: { id: student.id, firstName: student.firstName },
      date,
      kind,
      twist,
    }
    if (!gap) {
      return {
        ...base,
        found: false,
        reason: `You and ${student.firstName} have no shared free time for ${kind} on ${date}. Try another day with find_shared_free_time.`,
      }
    }

    const start = roundUp(gap.start)
    const end = Math.min(gap.end, start + config.duration)
    const plan =
      kind === 'lunch' || kind === 'dinner'
        ? await planMeal(quivr, student, date, start, end, twist)
        : kind === 'study'
          ? await planStudy(quivr, student, twist)
          : planDrinks(student, date, start, end, twist)

    if (!plan) {
      return {
        ...base,
        found: false,
        reason: `You are both free from ${toHHMM(start)} to ${toHHMM(end)}, but no venue fits (nothing open, or no matching diet options). Try another day or kind.`,
      }
    }
    return {
      ...base,
      found: true,
      slot: { start: toHHMM(start), end: toHHMM(end) },
      ...plan,
      ...dateExtras({
        student,
        date,
        start: toHHMM(start),
        kind,
        venue: plan.venue.name,
        menuPick:
          kind === 'lunch' || kind === 'dinner'
            ? plan.highlights[0]?.name
            : undefined,
      }),
    }
  },
})
