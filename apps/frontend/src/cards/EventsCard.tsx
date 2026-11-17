import type { CSSProperties } from 'react'

import { useChatActions } from './chat-actions'
import { DemoBadge } from './DemoBadge'
import { initials, longDate, shortDate, vars, weekdayShort } from './format'
import { NextSteps } from './NextSteps'
import type { NextStep } from './NextSteps'
import type { CardProps } from './types'
import './social-cards.css'

type Crowd = 'GREEN' | 'YELLOW' | 'RED' | 'CLOSED'

type CampusEvent = {
  title: string
  start: string
  end: string
  where: string
  area: string
  matchesYourInterests: boolean
  going: string[]
}

type Fakbar = {
  name: string
  area: string
  vibe: string
  crowdAt2100: Crowd
  crowdAt2300: Crowd
}

type CampusEvents = {
  demo: true
  note: string
  date: string
  events: CampusEvent[]
  fakbars: Fakbar[]
}

const CROWD: Record<
  Crowd,
  { filled: number; label: string; segment: string; text: string }
> = {
  GREEN: {
    filled: 1,
    label: 'quiet',
    segment: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]',
    text: 'text-emerald-300',
  },
  YELLOW: {
    filled: 2,
    label: 'lively',
    segment: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]',
    text: 'text-amber-300',
  },
  RED: {
    filled: 3,
    label: 'packed',
    segment: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.75)]',
    text: 'text-rose-300',
  },
  CLOSED: {
    filled: 0,
    label: 'closed',
    segment: '',
    text: 'text-white/35',
  },
}

const AVATAR_GRADIENTS = [
  'from-fuchsia-400 to-violet-500',
  'from-sky-400 to-indigo-500',
  'from-amber-300 to-rose-400',
  'from-emerald-300 to-teal-500',
]

const STARS = [
  { top: 8, left: 12, size: 2, o: 0.9, delay: 0 },
  { top: 14, left: 34, size: 1, o: 0.6, delay: 1.1 },
  { top: 6, left: 52, size: 1.5, o: 0.8, delay: 0.5 },
  { top: 22, left: 64, size: 1, o: 0.5, delay: 2.2 },
  { top: 11, left: 72, size: 2, o: 0.7, delay: 1.6 },
  { top: 30, left: 22, size: 1, o: 0.5, delay: 2.7 },
  { top: 42, left: 90, size: 1.5, o: 0.6, delay: 0.8 },
  { top: 55, left: 6, size: 1, o: 0.45, delay: 1.9 },
  { top: 68, left: 94, size: 1, o: 0.5, delay: 2.4 },
  { top: 80, left: 48, size: 1.5, o: 0.4, delay: 0.3 },
  { top: 90, left: 16, size: 1, o: 0.45, delay: 1.3 },
  { top: 18, left: 94, size: 1, o: 0.7, delay: 2.9 },
]

const localToday = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Events that get a "Go with someone" pill. */
const MAX_GO_WITH = 3

const isValidDate = (date: string) =>
  !Number.isNaN(Date.parse(`${date}T12:00:00Z`))

/** "2026-11-19" → "Thursday 19 November"; anything unparsable passes through. */
const dayOf = (date: string) => (isValidDate(date) ? longDate(date) : date)

/** "2026-11-19" → "2026-11-20" */
const nextDay = (date: string) => {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + 1)
  return day.toISOString().slice(0, 10)
}

const isOpen = (bar: Fakbar) =>
  bar.crowdAt2100 !== 'CLOSED' || bar.crowdAt2300 !== 'CLOSED'

const footerSteps = (date: string, isToday: boolean): NextStep[] => {
  if (!isValidDate(date)) return []
  const tomorrow = nextDay(date)
  return [
    {
      label: isToday
        ? '💘 Find a match for tonight'
        : `💘 Find a match for ${weekdayShort(date)} night`,
      message: `Find me a match who is free on ${dayOf(date)} evening`,
    },
    {
      label: isToday ? '📅 Tomorrow' : `📅 ${shortDate(tomorrow)}`,
      message: `What's on ${dayOf(tomorrow)}?`,
    },
  ]
}

const PILL_TONES = {
  fuchsia:
    'text-fuchsia-100 ring-fuchsia-300/40 hover:bg-fuchsia-400/20 hover:ring-fuchsia-300/70 focus-visible:ring-fuchsia-300',
  amber:
    'text-amber-100 ring-amber-300/40 hover:bg-amber-400/15 hover:ring-amber-300/70 focus-visible:ring-amber-300',
}

/** Small glassy quick reply that fits the night-sky card. */
function SkyPill({
  emoji,
  text,
  message,
  ariaLabel,
  tone = 'fuchsia',
}: {
  emoji: string
  text: string
  message: string
  ariaLabel: string
  tone?: keyof typeof PILL_TONES
}) {
  const { send, canSend } = useChatActions()
  return (
    <button
      type="button"
      disabled={!canSend}
      onClick={() => send(message)}
      title={message}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-semibold ring-1 transition hover:-translate-y-px focus-visible:ring-2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${PILL_TONES[tone]}`}
    >
      <span aria-hidden>{emoji}</span>
      {text}
    </button>
  )
}

const areaLabel = (area: string) => area.replace(/-/g, ' ')

const goingLabel = (going: string[]) => {
  const [first, second] = going
  if (going.length === 1) return `${first} is going`
  if (going.length === 2) return `${first} & ${second} going`
  return `${first}, ${second} +${going.length - 2} going`
}

const delay = (seconds: number): CSSProperties => ({
  animationDelay: `${seconds}s`,
})

function Sky() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
    >
      {STARS.map((star, i) => (
        <span
          key={i}
          className="sc-star absolute rounded-full bg-white"
          style={vars({
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
            '--sc-o': star.o,
          })}
        />
      ))}
      <span className="absolute top-3 right-4 size-9">
        <span className="sc-moon-halo absolute -inset-3 rounded-full bg-amber-200/20 blur-md" />
        <span className="sc-moon absolute inset-0" />
      </span>
    </div>
  )
}

function Going({ names }: { names: string[] }) {
  if (names.length === 0) return null
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <ul
        aria-label={`Going: ${names.join(', ')}`}
        className="flex -space-x-1.5"
      >
        {names.slice(0, 4).map((name, i) => (
          <li
            key={name}
            title={name}
            className={`flex size-6 items-center justify-center rounded-full bg-linear-to-br text-[9px] font-bold text-white ring-2 ring-[#1e1846] ${
              AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
            }`}
          >
            {initials(name)}
          </li>
        ))}
      </ul>
      <span className="text-[11px] text-white/60">{goingLabel(names)}</span>
    </div>
  )
}

function Timeline({ events, date }: { events: CampusEvent[]; date: string }) {
  return (
    <ol className="relative space-y-4">
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-[6px] w-px bg-linear-to-b from-fuchsia-400/70 via-indigo-400/40 to-transparent"
      />
      {events.map((event, i) => (
        <li
          key={`${event.title}-${event.start}`}
          className="sc-rise relative pl-6"
          style={delay(0.15 + i * 0.12)}
        >
          <span
            aria-hidden
            className="absolute top-1 left-0 size-3.5"
          >
            {event.matchesYourInterests && (
              <span className="sc-ring absolute inset-0 rounded-full bg-fuchsia-400/60" />
            )}
            <span
              className={`absolute inset-0.5 rounded-full ring-2 ring-[#1e1846] ${
                event.matchesYourInterests
                  ? 'bg-fuchsia-400 shadow-[0_0_10px_3px_rgba(232,121,249,0.55)]'
                  : 'bg-indigo-300 shadow-[0_0_8px_2px_rgba(165,180,252,0.4)]'
              }`}
            />
          </span>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <time className="text-[11px] font-bold text-indigo-200 tabular-nums">
              {event.start}–{event.end}
            </time>
            {event.matchesYourInterests && (
              <span className="rounded-full bg-fuchsia-400/15 px-2 py-px text-[10px] font-bold text-fuchsia-200 ring-1 ring-fuchsia-300/40">
                <span aria-hidden>✨</span> for you
              </span>
            )}
          </div>
          <div className="mt-0.5 font-bold text-white">{event.title}</div>
          <div className="text-xs text-white/70">
            <span aria-label="Where">📍</span> {event.where}
            <span className="text-white/45 [font-variant-caps:all-small-caps]">
              {' '}
              · {areaLabel(event.area)}
            </span>
          </div>
          <Going names={event.going} />
          {i < MAX_GO_WITH && (
            <div className="mt-2">
              <SkyPill
                emoji="👯"
                text="Go with someone"
                ariaLabel={`Go with someone to ${event.title}`}
                message={`Who would like to go to "${event.title}" with me on ${dayOf(date)}?`}
              />
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

function CrowdMeter({
  time,
  crowd,
  baseDelay,
}: {
  time: string
  crowd: Crowd
  baseDelay: number
}) {
  const level = CROWD[crowd] ?? CROWD.CLOSED
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`${time}: ${level.label}`}
      role="img"
    >
      <span className="w-8 text-[10px] text-white/50 tabular-nums">{time}</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="relative h-1.5 w-3.5 overflow-hidden rounded-full bg-white/10"
          >
            {i < level.filled && (
              <span
                className={`sc-seg absolute inset-0 rounded-full ${level.segment}`}
                style={delay(baseDelay + i * 0.12)}
              />
            )}
          </span>
        ))}
      </span>
      <span className={`w-10 text-[10px] ${level.text}`}>{level.label}</span>
    </div>
  )
}

function Fakbars({
  bars,
  offset,
  date,
}: {
  bars: Fakbar[]
  offset: number
  date: string
}) {
  return (
    <section aria-label="Fakbars">
      <h3 className="font-title mb-1.5 text-lg tracking-wide text-white/90">
        <span aria-hidden>🍺</span> Fakbars
      </h3>
      <ul className="divide-y divide-white/10 rounded-xl bg-white/5 ring-1 ring-white/10">
        {bars.map((bar, i) => {
          const start = offset + i * 0.12
          return (
            <li
              key={bar.name}
              className="sc-rise flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2"
              style={delay(start)}
            >
              <div className="min-w-0">
                <div className="font-bold text-white">{bar.name}</div>
                <div className="truncate text-xs text-white/55 italic">
                  {bar.vibe}
                </div>
                {isOpen(bar) && (
                  <div className="mt-1.5">
                    <SkyPill
                      emoji="🍻"
                      text="Drinks here"
                      tone="amber"
                      ariaLabel={`Drinks here: plan drinks at ${bar.name}`}
                      message={`Plan drinks on ${dayOf(date)} at ${bar.name}`}
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <CrowdMeter
                  time="21:00"
                  crowd={bar.crowdAt2100}
                  baseDelay={start + 0.25}
                />
                <CrowdMeter
                  time="23:00"
                  crowd={bar.crowdAt2300}
                  baseDelay={start + 0.45}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** `get_campus_events`: the night in Leuven, events timeline and fakbar crowds. */
export function EventsCard({ result, error }: CardProps) {
  const data = result as CampusEvents | undefined
  const events = data?.events ?? []
  const bars = data?.fakbars ?? []
  const isToday = data?.date === localToday()
  const steps = data?.date ? footerSteps(data.date, isToday) : []

  return (
    <article className="relative overflow-hidden rounded-xl bg-linear-to-br from-[#0b1433] via-[#1e1846] to-[#3b1d5c] p-4 text-sm text-white/90 shadow-[0_12px_30px_-12px_rgba(76,29,149,0.7)]">
      <Sky />

      <header className="relative mb-4 flex items-start justify-between gap-2 pr-12">
        <div className="min-w-0">
          <h2 className="font-title text-2xl leading-none tracking-wide text-white">
            {isToday || !data ? 'Tonight in Leuven' : 'Night out in Leuven'}
          </h2>
          {data?.date && (
            <p className="mt-0.5 text-xs text-indigo-200/80">
              {Number.isNaN(Date.parse(`${data.date}T12:00:00Z`))
                ? data.date
                : longDate(data.date)}
            </p>
          )}
        </div>
        <DemoBadge note={data?.note} />
      </header>

      <div className="relative space-y-5">
        {error || !data ? (
          <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-300/30">
            Couldn’t check what’s on: {error ?? 'no data.'}
          </p>
        ) : events.length === 0 && bars.length === 0 ? (
          <p className="sc-rise py-6 text-center text-white/75">
            Quiet night. Netflix and study? 🌙
          </p>
        ) : (
          <>
            {events.length > 0 && (
              <Timeline
                events={events}
                date={data.date}
              />
            )}
            {bars.length > 0 && (
              <Fakbars
                bars={bars}
                offset={0.25 + events.length * 0.12}
                date={data.date}
              />
            )}
          </>
        )}
      </div>

      {data && !error && steps.length > 0 && (
        <footer className="sc-steps relative mt-4 border-t border-white/10 pt-1">
          <NextSteps steps={steps} />
        </footer>
      )}
    </article>
  )
}
