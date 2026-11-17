import './date-cards.css'

import type { ReactNode } from 'react'

import { useChatActions } from './chat-actions'
import { DemoBadge } from './DemoBadge'
import { longDate, minutesOf, weekdayShort } from './format'
import { NextSteps } from './NextSteps'
import type { NextStep } from './NextSteps'
import type { CardProps } from './types'

type Slot = { date: string; start: string; end: string; minutes: number }

type FreeTime = {
  demo: true
  note: string
  student: { id: string; firstName: string }
  slots: Slot[]
}

const DAY_START = 8 * 60
const DAY_END = 22 * 60
const HOUR_PX = 24
const TRACK_HEIGHT = ((DAY_END - DAY_START) / 60) * HOUR_PX
const GRID_HOURS = [10, 12, 14, 16, 18, 20]
const AXIS_HOURS = [8, 10, 12, 14, 16, 18, 20, 22]
const LUNCH = { start: minutesOf('11:30'), end: minutesOf('14:00') }
const DINNER = { start: minutesOf('17:30'), end: minutesOf('20:30') }
const EVENING = { start: minutesOf('17:30'), end: DAY_END }
const DRINKS_FROM = minutesOf('20:00')
/** An evening slot needs at least this long to suggest drinks. */
const DRINKS_MIN_MINUTES = 60

type Kind = 'lunch' | 'dinner' | 'drinks' | 'study'
type Range = { start: number; end: number }

/** How each kind reads in a chat message: "Plan a lunch with …" */
const KINDS: Record<Kind, { phrase: string; emoji: string }> = {
  lunch: { phrase: 'a lunch', emoji: '🍝' },
  dinner: { phrase: 'a dinner', emoji: '🍷' },
  drinks: { phrase: 'drinks', emoji: '🍻' },
  study: { phrase: 'a study session', emoji: '📚' },
}
/** Slots shorter than this show their time on hover only. */
const LABEL_MIN_MINUTES = 50

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/** Minutes since midnight → % down the 08:00–22:00 track. */
const offset = (minutes: number) =>
  ((clamp(minutes, DAY_START, DAY_END) - DAY_START) / (DAY_END - DAY_START)) *
  100

const duration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest}`
}

const isFreeTime = (value: unknown): value is FreeTime =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as FreeTime).slots) &&
  typeof (value as FreeTime).student?.firstName === 'string'

const overlaps = (slot: Slot, range: Range) =>
  minutesOf(slot.start) < range.end && minutesOf(slot.end) > range.start

const overlapsLunch = (slot: Slot) => overlaps(slot, LUNCH)

const kindOf = (slot: Slot): Kind => {
  if (overlapsLunch(slot)) return 'lunch'
  if (overlaps(slot, DINNER)) return 'dinner'
  if (minutesOf(slot.start) >= DRINKS_FROM) return 'drinks'
  return 'study'
}

/** Minutes since midnight → "HH:MM" */
const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** "2026-11-19" → "Thursday 19 November"; anything unparsable passes through. */
const dayOf = (date: string) =>
  Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ? date : longDate(date)

const planMessage = (name: string, kind: Kind, date: string, time: string) =>
  `Plan ${KINDS[kind].phrase} with ${name} on ${dayOf(date)} at ${time}`

const eveningMinutes = (slot: Slot) =>
  Math.min(minutesOf(slot.end), EVENING.end) -
  Math.max(minutesOf(slot.start), EVENING.start)

/** Drinks from 20:00, or earlier when the slot ends too soon after that. */
const drinksTime = (slot: Slot) => {
  const start = minutesOf(slot.start)
  const latest = minutesOf(slot.end) - DRINKS_MIN_MINUTES
  return hhmm(Math.max(start, Math.min(DRINKS_FROM, latest)))
}

const nextSteps = (
  name: string,
  lunchSlot: Slot | undefined,
  eveningSlot: Slot | undefined
): NextStep[] => [
  ...(lunchSlot
    ? [
        {
          label: `🍝 Lunch ${weekdayShort(lunchSlot.date)} ${lunchSlot.start}`,
          message: planMessage(name, 'lunch', lunchSlot.date, lunchSlot.start),
        },
      ]
    : []),
  ...(eveningSlot
    ? [
        {
          label: `🍻 Drinks ${weekdayShort(eveningSlot.date)}`,
          message: planMessage(
            name,
            'drinks',
            eveningSlot.date,
            drinksTime(eveningSlot)
          ),
        },
      ]
    : []),
  {
    label: `💬 Say hi to ${name}`,
    message: `Draft a short message to ${name} to say hi`,
  },
]

function Frame({
  title,
  subtitle,
  note,
  children,
}: {
  title: ReactNode
  subtitle?: string
  note?: string
  children: ReactNode
}) {
  return (
    <section className="free-card my-1 overflow-hidden rounded-2xl bg-white shadow-[0_10px_24px_-12px_rgb(52_73_94/0.35)] ring-1 ring-black/5">
      <header className="free-band flex items-center gap-3 px-4 py-3 text-white">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-xl ring-1 ring-white/30"
        >
          🗓️
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-title truncate text-[1.6rem] leading-none tracking-wide">
            {title}
          </h3>
          {subtitle && <p className="mt-1 text-xs text-white/85">{subtitle}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-white">
          <DemoBadge note={note} />
        </span>
      </header>
      {children}
    </section>
  )
}

function SlotPill({
  slot,
  index,
  isLunch,
  firstName,
}: {
  slot: Slot
  index: number
  isLunch: boolean
  firstName: string
}) {
  const { send, canSend } = useChatActions()
  const top = offset(minutesOf(slot.start))
  const height = offset(minutesOf(slot.end)) - top
  const label = `${slot.start}–${slot.end}`
  const showsLabel = slot.minutes >= LABEL_MIN_MINUTES
  const kind = kindOf(slot)
  const message = planMessage(firstName, kind, slot.date, slot.start)

  return (
    <li
      className="absolute inset-x-1.5"
      style={{ top: `${top}%`, height: `${height}%`, minHeight: 10 }}
    >
      <button
        type="button"
        aria-disabled={!canSend}
        aria-label={`${dayOf(slot.date)}, ${slot.start} to ${slot.end}, ${duration(slot.minutes)}${isLunch ? ', good for lunch' : ''}. Plan ${KINDS[kind].phrase} with ${firstName}`}
        onClick={() => {
          if (canSend) send(message)
        }}
        className={`free-pill group absolute inset-0 flex flex-col items-center justify-center text-white outline-none ${isLunch ? 'free-pill--lunch' : ''}`}
        style={{ animationDelay: `${200 + index * 90}ms` }}
      >
        {showsLabel && (
          <span
            aria-hidden
            className="relative px-1 text-center text-[10px] leading-tight font-bold tabular-nums"
          >
            {label}
            {slot.minutes >= 100 && (
              <span className="block font-normal text-white/85">
                {duration(slot.minutes)}
              </span>
            )}
          </span>
        )}
        {isLunch && (
          <span
            aria-hidden
            className="free-lunch-tag bg-main text-sidenav-blue absolute -top-2.5 -right-1 z-10 rounded-full px-1.5 py-px text-[10px] font-bold whitespace-nowrap shadow-md"
            style={{ animationDelay: `${700 + index * 90}ms` }}
          >
            🍽 lunch?
          </span>
        )}
        <span
          aria-hidden
          className="bg-sidenav-blue pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 rounded-md px-2 py-1 text-[11px] font-bold whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {label} · {duration(slot.minutes)}
          <span className="text-main ml-1.5">
            {KINDS[kind].emoji} Plan {kind}
          </span>
        </span>
      </button>
    </li>
  )
}

export function FreeTimeCard({ result, error }: CardProps) {
  if (error || !isFreeTime(result)) {
    return (
      <Frame title="Shared free time">
        <p className="text-main-text px-4 py-5 text-sm">
          {error ?? 'The answer could not be read.'}
        </p>
      </Frame>
    )
  }

  const { slots, student } = result
  const title = (
    <>
      You <span className="text-rose-300">&amp;</span> {student.firstName} are
      both free
    </>
  )

  if (slots.length === 0) {
    return (
      <Frame
        title={title}
        note={result.note}
      >
        <div className="text-main-text px-4 py-8 text-center text-sm">
          <p className="font-title text-sidenav-blue text-2xl tracking-wide">
            No shared free time{' '}
            <span
              role="img"
              aria-label="sad"
            >
              😢
            </span>
          </p>
          <p className="mt-1">Try a wider date range or a shorter meet-up.</p>
          <div className="mt-2 flex justify-center">
            <NextSteps
              title="Or"
              steps={[
                {
                  label: '🔍 Find someone else',
                  message: 'Find me other matches',
                },
              ]}
            />
          </div>
        </div>
      </Frame>
    )
  }

  const dates = [...new Set(slots.map(slot => slot.date))].sort()
  const lunchSlot = slots
    .filter(overlapsLunch)
    .reduce<Slot | undefined>(
      (best, slot) => (!best || slot.minutes > best.minutes ? slot : best),
      undefined
    )
  const longest = slots.reduce((best, slot) =>
    slot.minutes > best.minutes ? slot : best
  )
  const eveningSlot = slots
    .filter(slot => eveningMinutes(slot) >= DRINKS_MIN_MINUTES)
    .reduce<Slot | undefined>(
      (best, slot) =>
        !best || eveningMinutes(slot) > eveningMinutes(best) ? slot : best,
      undefined
    )
  const total = slots.reduce((sum, slot) => sum + slot.minutes, 0)
  const subtitle = `${slots.length} ${slots.length === 1 ? 'slot' : 'slots'} over ${dates.length} ${dates.length === 1 ? 'day' : 'days'} · ${duration(total)} in total`

  return (
    <Frame
      title={title}
      subtitle={subtitle}
      note={result.note}
    >
      <div className="overflow-x-auto px-3 pt-4 pb-3">
        <div
          className="mx-auto grid w-full gap-x-1.5"
          style={{
            gridTemplateColumns: `2.25rem repeat(${dates.length}, minmax(4.75rem, 1fr))`,
            maxWidth: `calc(2.25rem + ${dates.length} * 8.5rem)`,
          }}
        >
          <div aria-hidden />
          {dates.map(date => (
            <div
              key={date}
              className="pb-2 text-center"
              title={longDate(date)}
            >
              <div className="text-sidenav-secondary text-[10px] font-bold tracking-[0.18em] uppercase">
                {weekdayShort(date)}
              </div>
              <div className="font-title text-sidenav-blue text-2xl leading-none">
                {Number(date.slice(8))}
              </div>
            </div>
          ))}

          <div
            aria-hidden
            className="relative"
            style={{ height: TRACK_HEIGHT }}
          >
            {AXIS_HOURS.map(hour => (
              <span
                key={hour}
                className="text-sidenav-secondary absolute right-1 -translate-y-1/2 text-[10px] tabular-nums"
                style={{ top: `${offset(hour * 60)}%` }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {dates.map(date => (
            <div
              key={date}
              role="group"
              aria-label={longDate(date)}
              className="free-track relative rounded-xl"
              style={{ height: TRACK_HEIGHT }}
            >
              <div
                aria-hidden
                className="free-lunch-zone absolute inset-x-0"
                style={{
                  top: `${offset(LUNCH.start)}%`,
                  height: `${offset(LUNCH.end) - offset(LUNCH.start)}%`,
                }}
              />
              {GRID_HOURS.map(hour => (
                <div
                  key={hour}
                  aria-hidden
                  className="border-sidenav-blue/10 absolute inset-x-0 border-t"
                  style={{ top: `${offset(hour * 60)}%` }}
                />
              ))}
              <ul>
                {slots
                  .filter(slot => slot.date === date)
                  .map(slot => (
                    <SlotPill
                      key={`${slot.start}-${slot.end}`}
                      slot={slot}
                      index={slots.indexOf(slot)}
                      isLunch={slot === lunchSlot}
                      firstName={student.firstName}
                    />
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <footer className="text-main-text border-schedule-border-grey border-t border-dashed px-4 pt-2.5 pb-3 text-xs">
        <p>
          Longest:{' '}
          <strong className="text-sidenav-blue">
            {longDate(longest.date)}, {longest.start}–{longest.end}
          </strong>{' '}
          ({duration(longest.minutes)})
          {lunchSlot && (
            <>
              {' '}
              · Lunch pick:{' '}
              <strong className="text-sidenav-blue">
                {weekdayShort(lunchSlot.date)} {lunchSlot.start}
              </strong>
            </>
          )}
        </p>
        <NextSteps
          steps={nextSteps(student.firstName, lunchSlot, eveningSlot)}
        />
      </footer>
    </Frame>
  )
}
