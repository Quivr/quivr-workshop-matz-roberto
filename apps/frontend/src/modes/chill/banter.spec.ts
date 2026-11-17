import { describe, expect, it } from 'vitest'

import { NEUTRAL_EXCHANGES, buildExchanges } from './banter'
import { NO_FACTS, type BarFacts } from './facts'
import { getCharacter } from '../../characters/registry'

const item = (
  title: string,
  start: string,
  end: string,
  location: string | null = null
) => ({
  title,
  start: `2026-01-${start}:00+01:00`,
  end: `2026-01-${end}:00+01:00`,
  location,
})

// Monday 5 January 2026 and Tuesday 6 January 2026 (made-up classes).
const FACTS: BarFacts = {
  schedule: [
    item('Algebra', '05T08:00', '05T10:00', 'Hall A'),
    item('Chemistry', '05T10:10', '05T12:00', 'Lab B'),
    item('Poetry', '05T16:30', '05T18:00', 'Room C'),
    item('Statistics', '06T09:00', '06T10:00'),
    item('Seminar', '06T10:00', '06T11:00'),
    item('Workshop', '06T11:00', '06T12:00'),
    item('Debate', '06T12:00', '06T13:00'),
  ],
  classmates: [
    {
      ...item('Algebra', '05T08:00', '05T10:00', 'Hall A'),
      classmates: [
        { name: 'Sam Example', isSameClass: true, title: 'Algebra' },
      ],
    },
    {
      ...item('Poetry', '05T16:30', '05T18:00', 'Room C'),
      classmates: [{ name: 'Kim Example', isSameClass: false, title: 'Choir' }],
    },
  ],
  menu: {
    restaurant: 'Alma Example',
    date: '2026-01-05',
    dish: 'Stew',
    price: 6.35,
  },
}

const textOf = (facts: BarFacts) =>
  buildExchanges(facts).flatMap(exchange =>
    exchange.lines.map(line => line.text)
  )
const find = (facts: BarFacts, id: string) =>
  buildExchanges(facts).find(exchange => exchange.id.startsWith(id))

describe('banter from real schedule data', () => {
  it('fills the early-lecture template with the real title, day, time and place', () => {
    const lines = find(FACTS, 'early')
      ?.lines.map(l => l.text)
      .join(' ')
    expect(lines).toContain('Algebra on Monday at 08:00')
    expect(lines).toContain('In Hall A')
  })

  it('names the big gap with its real length and the two classes around it', () => {
    const text = find(FACTS, 'gap')
      ?.lines.map(l => l.text)
      .join(' ')
    expect(text).toContain('4 hours 30 minutes')
    expect(text).toContain('Chemistry')
    expect(text).toContain('Poetry')
  })

  it('counts the packed day from the data', () => {
    expect(find(FACTS, 'packed')?.lines[0]?.text).toContain(
      'Tuesday has 4 things'
    )
  })

  it('spots a tight move between two different places, and only that', () => {
    const text = find(FACTS, 'tight')?.lines[0]?.text
    expect(text).toContain('Algebra ends at 10:00')
    expect(text).toContain('Chemistry starts at 10:10')
    expect(text).toContain('Hall A')
    expect(text).toContain('Lab B')
  })

  it('uses friends from get_classmates, same class only when it is', () => {
    expect(find(FACTS, 'classmates')?.lines[0]?.text).toContain(
      'Sam Example is in Algebra too'
    )
    const overlap = find(FACTS, 'overlap')?.lines[0]?.text
    expect(overlap).toContain('Kim Example has Choir')
    expect(overlap).not.toMatch(/same class|is in Poetry/)
  })

  it('adds lunch from the menu, before a class that day when there is one', () => {
    const text = find(FACTS, 'lunch')?.lines[0]?.text
    expect(text).toContain('Alma Example has Stew for €6.35 on Monday')
    expect(text).toContain('before Poetry at 16:30')
  })

  it('only says things that trace back to the facts', () => {
    const known = [
      'Algebra',
      'Chemistry',
      'Poetry',
      'Statistics',
      'Seminar',
      'Workshop',
      'Debate',
      'Hall A',
      'Lab B',
      'Room C',
      'Sam Example',
      'Kim Example',
      'Choir',
      'Alma Example',
      'Stew',
    ]
    const allowedNumbers = new Set([
      '08:00',
      '10:00',
      '10:10',
      '16:30',
      '12:00',
      '13:00',
      '11:00',
      '09:00',
      '4',
      '30',
      '6.35',
    ])
    for (const text of textOf(FACTS)) {
      for (const number of text.match(/\d+(?::\d+|\.\d+)?/g) ?? []) {
        expect(allowedNumbers.has(number), `${number} in "${text}"`).toBe(true)
      }
      // Any capitalised word that is not the start of a sentence must be a known name.
      for (const title of text.match(/(?<=\w )[A-Z][a-z]+(?: [A-Z][a-z]+)*/g) ??
        []) {
        const ok =
          known.some(name => name.includes(title) || title.includes(name)) ||
          [
            'Monday',
            'Tuesday',
            'On',
            'Out',
            'Eat',
            'Pace',
            'Run',
            'Anyway',
            'Gus',
            'Bram',
            'Not',
            'Only',
            'Listed',
            'Sigh',
            'Early',
            'Ask',
            'Who',
            'What',
            'You',
            'Your',
            'And',
            'That',
            'First',
            'Fizzy',
            'Do',
            'I',
            'A',
            'An',
            'It',
            'This',
            'Bitter',
            'Something',
            'BUBBLES',
            'Stien',
            'Pip',
          ].includes(title)
        expect(ok, `${title} in "${text}"`).toBe(true)
      }
    }
  })

  it('gives every line to a character that exists', () => {
    for (const exchange of buildExchanges(FACTS)) {
      for (const line of exchange.lines) {
        expect(getCharacter(line.speaker), line.speaker).toBeDefined()
      }
    }
  })

  it('has unique ids so each exchange plays once', () => {
    const ids = buildExchanges(FACTS).map(exchange => exchange.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('banter without data', () => {
  it('makes no factual claim when nothing was fetched', () => {
    const exchanges = buildExchanges(NO_FACTS)
    expect(exchanges).toEqual(NEUTRAL_EXCHANGES)
    for (const text of textOf(NO_FACTS)) {
      expect(text).not.toMatch(/\d/)
      expect(text).not.toMatch(/schedule|class|lecture|lunch|€/i)
    }
  })

  it('only says the schedule came back empty when it did, and invents no class', () => {
    const empty = buildExchanges({ ...NO_FACTS, schedule: [] })
    expect(empty.map(exchange => exchange.id)).toEqual([
      'empty',
      ...NEUTRAL_EXCHANGES.map(exchange => exchange.id),
    ])
    const text = empty[0]?.lines.map(l => l.text).join(' ') ?? ''
    expect(text).toMatch(/empty/)
    expect(text).not.toMatch(/\d/)
    expect(textOf(NO_FACTS).join(' ')).not.toMatch(/empty/)
  })

  it('does not talk about early lectures, gaps or lunch on an empty day', () => {
    const ids = buildExchanges({ ...NO_FACTS, schedule: [] }).map(e => e.id)
    expect(
      ids.filter(id =>
        /early|gap|packed|tight|free|first|lunch|classmates/.test(id)
      )
    ).toEqual([])
  })
})
