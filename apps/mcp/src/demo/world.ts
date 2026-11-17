import { toMinutes, weekdayOf, type Day } from './schedule.js'

/** Areas of Leuven the frontend map knows how to draw. */
export type MapArea =
  | 'centrum'
  | 'naamsestraat'
  | 'tiensestraat'
  | 'groep-t'
  | 'vaartkom'
  | 'station'
  | 'arenberg'
  | 'heverlee'
  | 'gasthuisberg'

export type PlaceKind = 'restaurant' | 'library' | 'fakbar'

/** Real restaurant ids (from Restaurants.json) → where they are on the map. */
export const RESTAURANTS: Record<string, { name: string; area: MapArea }> = {
  '1': { name: 'Alma 1', area: 'tiensestraat' },
  '2': { name: 'Alma 2', area: 'naamsestraat' },
  '3': { name: 'Alma Groep T', area: 'groep-t' },
  '4': { name: "Alma 't Academisch kwartier", area: 'tiensestraat' },
  '5': { name: 'Alma 3', area: 'heverlee' },
  '6': { name: 'Alma ESAT2', area: 'arenberg' },
  '7': { name: 'Alma De Moete', area: 'arenberg' },
  '8': { name: 'Alma Gasthuisberg', area: 'gasthuisberg' },
  '41': { name: 'Alma Quadrivium', area: 'arenberg' },
}

/** Real library ids (from Libraries.json) → where they are on the map. */
export const LIBRARIES: Record<string, { name: string; area: MapArea }> = {
  '2': { name: '2Bergen - Campus Arenberg', area: 'arenberg' },
  '8': { name: '2Bergen - Learning centre Désiré Collen', area: 'arenberg' },
  '13': { name: 'Artes – Erasmushuis', area: 'centrum' },
  '14': { name: 'Artes – Universiteitsbibliotheek', area: 'centrum' },
  '19': { name: 'Vleminckxveld Economics and Business', area: 'naamsestraat' },
  '21': { name: 'Institute of Philosophy', area: 'naamsestraat' },
  '22': { name: 'Learning Centre AGORA', area: 'tiensestraat' },
  '26': {
    name: 'Vleminckxveld Psychology and Educational Sciences',
    area: 'naamsestraat',
  },
  '27': { name: 'Law and criminology', area: 'tiensestraat' },
  '28': { name: 'Vleminckxveld Social Sciences', area: 'naamsestraat' },
}

export type Busyness = 'GREEN' | 'YELLOW' | 'RED' | 'CLOSED'

/** Invented faculty bars. Quivr has fakbars, but we have no recording of them. */
export type Fakbar = {
  id: string
  name: string
  area: MapArea
  openDays: Day[]
  vibe: string
}

export const FAKBARS: Fakbar[] = [
  {
    id: 'bernoulli',
    name: 'Bar Bernoulli',
    area: 'arenberg',
    openDays: [3, 4],
    vibe: 'engineers arguing about the best way to cool a beer',
  },
  {
    id: 'cogito',
    name: 'Café Cogito',
    area: 'naamsestraat',
    openDays: [2, 3, 4],
    vibe: 'candles, chess and existential small talk',
  },
  {
    id: 'pipet',
    name: 'De Gouden Pipet',
    area: 'gasthuisberg',
    openDays: [3, 4],
    vibe: 'lab coats are technically a dress code',
  },
  {
    id: 'kapitaal',
    name: 'Het Kapitaal',
    area: 'naamsestraat',
    openDays: [4],
    vibe: 'cheap pints, expensive opinions',
  },
  {
    id: 'lex',
    name: 'Lex Lokaal',
    area: 'tiensestraat',
    openDays: [2, 4],
    vibe: 'objection! this table is taken',
  },
  {
    id: 'kanaal',
    name: 'Kot aan het Kanaal',
    area: 'vaartkom',
    openDays: [4, 5],
    vibe: 'string lights, a speaker and someone who owns a guitar',
  },
]

export const FAKBAR_OPEN = toMinutes('20:00')
export const FAKBAR_CLOSE = toMinutes('23:59')

const hash = (text: string): number =>
  [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 7)

/** Predicted crowd level: quiet early, busy late, and every bar has its own character. */
export const busynessAt = (
  bar: Fakbar,
  date: string,
  minutes: number
): Busyness => {
  if (!bar.openDays.includes(weekdayOf(date))) return 'CLOSED'
  if (minutes < FAKBAR_OPEN || minutes > FAKBAR_CLOSE) return 'CLOSED'
  const levels: Busyness[] = ['GREEN', 'YELLOW', 'RED']
  const base =
    minutes < toMinutes('21:30') ? 0 : minutes < toMinutes('23:00') ? 1 : 2
  const shift = hash(`${bar.id}${date}`) % 3 === 0 ? 1 : 0
  return levels[Math.min(2, base + shift)] ?? 'RED'
}

export type CampusEvent = {
  id: string
  day: Day
  start: string
  end: string
  title: string
  where: string
  area: MapArea
  tags: string[]
}

/** The same weekly programme every week. */
export const EVENTS: CampusEvent[] = [
  {
    id: 'language-cafe',
    day: 1,
    start: '19:00',
    end: '21:00',
    title: 'Language café: Dutch for the brave',
    where: 'Café Cogito',
    area: 'naamsestraat',
    tags: ['languages', 'travel'],
  },
  {
    id: 'pub-quiz',
    day: 2,
    start: '20:00',
    end: '22:30',
    title: 'Pub quiz: Alma Edition',
    where: 'Lex Lokaal',
    area: 'tiensestraat',
    tags: ['board games', 'debating', 'chess'],
  },
  {
    id: 'pop-up-concert',
    day: 3,
    start: '12:15',
    end: '13:00',
    title: 'Free lunchtime pop-up concert',
    where: 'Ladeuzeplein',
    area: 'centrum',
    tags: ['live music'],
  },
  {
    id: 'game-night',
    day: 3,
    start: '20:00',
    end: '23:00',
    title: 'Board game night (Catan is banned)',
    where: 'Café Cogito',
    area: 'naamsestraat',
    tags: ['board games', 'chess'],
  },
  {
    id: 'climbing-intro',
    day: 4,
    start: '18:00',
    end: '19:30',
    title: 'Beginner bouldering with free shoe rental',
    where: 'The boulder hall',
    area: 'vaartkom',
    tags: ['climbing'],
  },
  {
    id: 'open-mic',
    day: 4,
    start: '21:00',
    end: '23:30',
    title: 'Open mic: bad poetry, good beer',
    where: 'Bar Bernoulli',
    area: 'arenberg',
    tags: ['live music', 'theatre', 'photography'],
  },
  {
    id: 'singalong',
    day: 5,
    start: '21:30',
    end: '23:59',
    title: 'Friendly student singalong (no cantus rules)',
    where: 'Kot aan het Kanaal',
    area: 'vaartkom',
    tags: ['live music', 'dancing'],
  },
  {
    id: 'run-club',
    day: 6,
    start: '10:00',
    end: '11:30',
    title: 'Dijle run club: 5 km, social pace',
    where: 'Station square',
    area: 'station',
    tags: ['running', 'cycling', 'hiking'],
  },
  {
    id: 'pancakes',
    day: 7,
    start: '11:00',
    end: '14:00',
    title: 'Pancake Sunday at a kot in the Vaartkom',
    where: 'Vaartkom',
    area: 'vaartkom',
    tags: ['cooking', 'travel'],
  },
]
