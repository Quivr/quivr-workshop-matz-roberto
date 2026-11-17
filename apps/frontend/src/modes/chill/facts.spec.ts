import type { Message } from '@ag-ui/core'
import { describe, expect, it } from 'vitest'

import {
  dayOf,
  minutesBetween,
  parseBarFacts,
  timeOf,
  weekdayOf,
} from './facts'

const call = (id: string, name: string): Message => ({
  id: `a-${id}`,
  role: 'assistant',
  toolCalls: [{ id, type: 'function', function: { name, arguments: '{}' } }],
})
const result = (id: string, content: unknown): Message => ({
  id: `t-${id}`,
  role: 'tool',
  toolCallId: id,
  content: typeof content === 'string' ? content : JSON.stringify(content),
})

describe('parseBarFacts', () => {
  it('reads the schedule from get_my_schedule results, sorted', () => {
    const facts = parseBarFacts([
      call('1', 'get_my_schedule'),
      result('1', [
        {
          kind: 'class',
          title: 'Late',
          start: '2026-01-05T14:00:00+01:00',
          end: '2026-01-05T16:00:00+01:00',
        },
        {
          kind: 'class',
          title: 'Early',
          start: '2026-01-05T08:30:00+01:00',
          end: '2026-01-05T10:30:00+01:00',
          location: 'Room A',
        },
      ]),
    ])
    expect(facts.schedule?.map(item => item.title)).toEqual(['Early', 'Late'])
    expect(facts.schedule?.[0]?.location).toBe('Room A')
    expect(facts.schedule?.[1]?.location).toBeNull()
  })

  it('tells "fetched and empty" from "never fetched"', () => {
    expect(
      parseBarFacts([call('1', 'get_my_schedule'), result('1', [])]).schedule
    ).toEqual([])
    expect(parseBarFacts([]).schedule).toBeNull()
  })

  it('ignores failed, malformed and unknown tool results', () => {
    const facts = parseBarFacts([
      call('1', 'get_my_schedule'),
      result('1', 'Error: Ask for at most 14 days at a time'),
      call('2', 'get_menu'),
      result('2', 'not json'),
      call('3', 'get_library_occupancy'),
      result('3', [
        {
          title: 'x',
          start: '2026-01-05T08:30:00+01:00',
          end: '2026-01-05T09:30:00+01:00',
        },
      ]),
    ])
    expect(facts).toEqual({ schedule: null, classmates: [], menu: null })
  })

  it('drops schedule items without a title or a real time', () => {
    const facts = parseBarFacts([
      call('1', 'get_my_schedule'),
      result('1', [
        {
          title: '',
          start: '2026-01-05T08:30:00+01:00',
          end: '2026-01-05T09:00:00+01:00',
        },
        { title: 'No time', start: 'soon', end: 'later' },
        { title: 42 },
        null,
      ]),
    ])
    expect(facts.schedule).toEqual([])
  })

  it('reads classmates from get_classmates', () => {
    const facts = parseBarFacts([
      call('1', 'get_classmates'),
      result('1', {
        date: '2026-01-05',
        friendsChecked: 2,
        classes: [
          {
            title: 'Maths',
            start: '2026-01-05T10:00:00+01:00',
            end: '2026-01-05T12:00:00+01:00',
            location: null,
            classmates: [
              { name: 'Sam Example', isSameClass: true, title: 'Maths' },
              { name: '', isSameClass: true },
            ],
          },
        ],
      }),
    ])
    expect(facts.classmates).toHaveLength(1)
    expect(facts.classmates[0]?.classmates).toEqual([
      { name: 'Sam Example', isSameClass: true, title: 'Maths' },
    ])
  })

  it('picks a warm dish with a price from get_menu', () => {
    const facts = parseBarFacts([
      call('1', 'get_menu'),
      result('1', {
        restaurant: 'Alma Example',
        date: '2026-01-05',
        dishes: [
          { name: 'Soup', category: 'SOUP', prices: [3] },
          { name: 'Stew', category: 'WARM_BUFFET', prices: [6.35, 7] },
        ],
      }),
    ])
    expect(facts.menu).toEqual({
      restaurant: 'Alma Example',
      date: '2026-01-05',
      dish: 'Stew',
      price: 6.35,
    })
  })
})

describe('date helpers', () => {
  it('reads day, time and weekday from the ISO string itself', () => {
    const start = '2026-11-18T08:30:00+01:00'
    expect(dayOf(start)).toBe('2026-11-18')
    expect(timeOf(start)).toBe('08:30')
    expect(weekdayOf(start)).toBe('Wednesday')
    expect(minutesBetween(start, '2026-11-18T12:45:00+01:00')).toBe(255)
  })
})
