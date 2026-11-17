import './date-cards.css'

import type { ReactNode } from 'react'

import { useChatActions } from './chat-actions'
import { DemoBadge } from './DemoBadge'
import { euro, longDate, minutesOf, shortDate } from './format'
import {
  AREA_NAMES,
  LeuvenMap,
  MAP_HEIGHT,
  MAP_WIDTH,
  pointOf,
  YouMarker,
  youPoint,
} from './LeuvenMap'
import type { MapArea } from './LeuvenMap'
import { NextSteps } from './NextSteps'
import type { NextStep } from './NextSteps'
import type { CardProps } from './types'

type Kind = 'lunch' | 'dinner' | 'study' | 'drinks'
type VenueKind = 'restaurant' | 'library' | 'fakbar' | 'event'
type Crowd = 'GREEN' | 'YELLOW' | 'RED' | 'CLOSED'

type Venue = {
  id: string
  name: string
  kind: VenueKind
  area: MapArea
  percentFull?: number
  expectedCrowd?: Crowd
}

type Highlight = {
  name: string
  priceEur?: number
  vegetarian: boolean
  vegan: boolean
}

type PlanBase = {
  demo: true
  note: string
  student: { id: string; firstName: string }
  date: string
  kind: Kind
}

type NoPlan = PlanBase & { found: false; reason: string }

type Plan = PlanBase & {
  found: true
  twist?: 'budget' | 'quiet' | 'chaos'
  slot: { start: string; end: string }
  venue: Venue
  highlights: Highlight[]
  why: string[]
  alternatives: string[]
  caveat?: string
  mission?: { title: string; text: string }[]
  inviteDrafts?: { tone: 'sweet' | 'absurd' | 'low-key'; message: string }[]
}

type DatePlan = NoPlan | Plan

/** Where "you" start the route on the mini-map. */
const HOME: MapArea = 'arenberg'
const MAX_ZOOM = 2.6

const KINDS: Record<Kind, { emoji: string; label: string }> = {
  lunch: { emoji: '🍝', label: 'Lunch date' },
  dinner: { emoji: '🍷', label: 'Dinner date' },
  study: { emoji: '📚', label: 'Study date' },
  drinks: { emoji: '🍻', label: 'Drinks date' },
}

const KIND_ORDER: Kind[] = ['lunch', 'dinner', 'study', 'drinks']

/** How each kind reads in a chat message: "Plan a study session with …" */
const KIND_NOUNS: Record<Kind, string> = {
  lunch: 'lunch',
  dinner: 'dinner',
  study: 'study session',
  drinks: 'drinks',
}

const VENUE_KINDS: Record<VenueKind, { emoji: string; label: string }> = {
  restaurant: { emoji: '🍽️', label: 'Restaurant' },
  library: { emoji: '📚', label: 'Library' },
  fakbar: { emoji: '🍻', label: 'Fakbar' },
  event: { emoji: '🎉', label: 'Event' },
}

const CROWDS: Record<Crowd, { label: string; level: number; color: string }> = {
  GREEN: { label: 'Quiet', level: 1, color: 'bg-green-status' },
  YELLOW: { label: 'Lively', level: 2, color: 'bg-main' },
  RED: { label: 'Packed', level: 3, color: 'bg-danger' },
  CLOSED: { label: 'Closed', level: 0, color: 'bg-schedule-border-grey' },
}

const LABEL = 'text-muted text-[10px] font-bold tracking-[0.18em] uppercase'

const kindOf = (kind: string) => KINDS[kind as Kind] ?? KINDS.lunch
const venueKindOf = (kind: string) =>
  VENUE_KINDS[kind as VenueKind] ?? VENUE_KINDS.event
const areaName = (area: string) => AREA_NAMES[area as MapArea] ?? area

const kindNoun = (kind: string) => KIND_NOUNS[kind as Kind] ?? kind
const aKind = (kind: string) =>
  kind === 'drinks' ? kindNoun(kind) : `a ${kindNoun(kind)}`
const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

/** "2026-11-19" → "Thursday 19 November"; anything unparsable passes through. */
const dayOf = (date: string) =>
  Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ? date : longDate(date)

const anotherDay = (plan: DatePlan): NextStep => ({
  label: '🔁 Another day',
  message: `Plan ${aKind(plan.kind)} with ${plan.student.firstName} on another day this week`,
})

const tweakSteps = (plan: Plan): NextStep[] => {
  const name = plan.student.firstName
  const day = dayOf(plan.date)
  const venues = [...new Set(plan.alternatives ?? [])].filter(
    alt => alt !== plan.venue.name
  )
  return [
    anotherDay(plan),
    ...venues.map(alt => ({
      label: `📍 ${alt}`,
      message: `Plan the ${kindNoun(plan.kind)} with ${name} on ${day} at ${alt} instead`,
    })),
    ...KIND_ORDER.filter(kind => kind !== plan.kind).map(kind => ({
      label: `${KINDS[kind].emoji} ${capitalize(kind)}`,
      message: `Plan ${aKind(kind)} with ${name} on ${day} instead`,
    })),
  ]
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const duration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest}`
}

const ticketCode = (plan: DatePlan) =>
  [
    'QV',
    plan.kind.slice(0, 2).toUpperCase(),
    plan.date.slice(5).replace('-', ''),
    ...(plan.found ? [plan.venue.id] : []),
  ].join(' · ')

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isDatePlan = (value: unknown): value is DatePlan => {
  if (!isObject(value) || !isObject(value.student)) return false
  if (typeof value.date !== 'string' || typeof value.found !== 'boolean')
    return false
  return !value.found || (isObject(value.slot) && isObject(value.venue))
}

function Ticket({
  label,
  isFaded = false,
  main,
  stub,
}: {
  label: string
  isFaded?: boolean
  main: ReactNode
  stub: ReactNode
}) {
  return (
    <article
      aria-label={label}
      className={`date-ticket my-1 ${isFaded ? 'date-ticket--faded' : ''}`}
    >
      <div className="date-ticket__body">
        <div className="date-ticket__main overflow-hidden">{main}</div>
        <div className="date-ticket__stub overflow-hidden">{stub}</div>
      </div>
    </article>
  )
}

function Band({
  emoji,
  eyebrow,
  note,
  children,
}: {
  emoji: string
  eyebrow: string
  note?: string
  children: ReactNode
}) {
  return (
    <header className="date-ticket__band flex items-center gap-3 px-4 py-3 text-white">
      <span
        role="img"
        aria-label={eyebrow}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-xl ring-1 ring-white/30"
      >
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold tracking-[0.22em] text-white/85 uppercase">
          {eyebrow}
        </p>
        <h3 className="font-title truncate text-[1.75rem] leading-none tracking-wide">
          {children}
        </h3>
      </div>
      <span className="bg-surface shrink-0 rounded-full">
        <DemoBadge note={note} />
      </span>
    </header>
  )
}

function YouAnd({ name, isBroken }: { name: string; isBroken?: boolean }) {
  return (
    <>
      You{' '}
      <span
        aria-hidden
        className={isBroken ? '' : 'date-heart text-rose-300'}
      >
        {isBroken ? '💔' : '♥'}
      </span>
      <span className="sr-only">and</span> {name}
    </>
  )
}

function Field({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className={LABEL}>{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

function DietBadge({ dish }: { dish: Highlight }) {
  if (dish.vegan) {
    return (
      <span className="bg-vegan text-on-diet shrink-0 rounded px-1.5 text-[10px]">
        vegan
      </span>
    )
  }
  if (dish.vegetarian) {
    return (
      <span className="bg-vegetarian text-on-diet shrink-0 rounded px-1.5 text-[10px]">
        veggie
      </span>
    )
  }
  return null
}

function CrowdMeter({ crowd }: { crowd: Crowd }) {
  const { label, level, color } = CROWDS[crowd] ?? CROWDS.YELLOW

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span
        aria-hidden
        className="flex h-4 items-end gap-0.5"
      >
        {[1, 2, 3].map(bar => (
          <span
            key={bar}
            className={`date-grow-y w-1.5 rounded-sm ${bar <= level ? color : 'bg-schedule-border-grey'}`}
            style={{
              height: `${bar * 5 + 1}px`,
              animationDelay: `${bar * 120}ms`,
            }}
          />
        ))}
      </span>
      <span>
        Expected crowd: <strong className="text-heading">{label}</strong>
      </span>
    </div>
  )
}

function OccupancyBar({ percent }: { percent: number }) {
  const value = clamp(Math.round(percent), 0, 100)
  const color =
    value < 50 ? 'bg-green-status' : value < 80 ? 'bg-main' : 'bg-danger'

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span
        aria-hidden
        className="bg-schedule-bg-grey h-2 w-28 overflow-hidden rounded-full"
      >
        <span
          className={`date-grow-x block h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </span>
      <span>
        <strong className="text-heading">{value}%</strong> full right now
      </span>
    </div>
  )
}

function MiniMap({ venue }: { venue: Venue }) {
  const pin = pointOf(venue.area)
  const you = youPoint(HOME)
  const hasRoute = venue.area !== HOME
  const points = hasRoute ? [pin, you] : [pin]
  const xs = points.map(point => point.x)
  const ys = points.map(point => point.y)
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ]

  // Zoom in as far as both ends of the route still fit, then centre on them.
  const zoom = clamp(
    Math.min(MAP_WIDTH / (maxX - minX + 180), MAP_HEIGHT / (maxY - minY + 140)),
    1,
    MAX_ZOOM
  )
  const tx = clamp(0.5 - (zoom * (minX + maxX)) / 2 / MAP_WIDTH, 1 - zoom, 0)
  const ty = clamp(0.5 - (zoom * (minY + maxY)) / 2 / MAP_HEIGHT, 1 - zoom, 0)
  const pinScale = 2.6 / zoom

  const [dx, dy] = [pin.x - you.x, pin.y - you.y]
  const bend = {
    x: (you.x + pin.x) / 2 - dy * 0.25,
    y: (you.y + pin.y) / 2 + dx * 0.25,
  }

  return (
    <figure className="date-minimap min-w-0 grow basis-44">
      <div
        className="ring-heading/10 relative overflow-hidden rounded-xl shadow-inner ring-1"
        style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
      >
        <div
          style={{
            transform: `translate(${tx * 100}%, ${ty * 100}%) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <LeuvenMap>
            {hasRoute && (
              <path
                d={`M${you.x} ${you.y}Q${bend.x} ${bend.y} ${pin.x} ${pin.y}`}
                strokeWidth={4 / zoom}
                strokeDasharray={`${1 / zoom} ${9 / zoom}`}
                strokeLinecap="round"
                className="date-route fill-none stroke-rose-500"
              />
            )}
            <YouMarker area={HOME} />
            <g transform={`translate(${pin.x} ${pin.y}) scale(${pinScale})`}>
              <circle
                r={7}
                className="date-pin-pulse fill-rose-500/40"
              />
              <ellipse
                rx={4}
                ry={1.5}
                className="fill-black/20"
              />
              <g className="date-pin">
                <path
                  d="M0 0C-3-6-9-10-9-17a9 9 0 1 1 18 0C9-10 3-6 0 0Z"
                  strokeWidth={1.5}
                  className="fill-rose-600 stroke-white"
                />
                <text
                  y={-17}
                  dy="0.35em"
                  textAnchor="middle"
                  fontSize={10}
                  className="fill-white"
                >
                  ♥
                </text>
              </g>
            </g>
          </LeuvenMap>
        </div>
      </div>
      <figcaption className="text-muted mt-1.5 truncate text-[11px]">
        <span aria-hidden>📍 </span>
        {venue.name}, {areaName(venue.area)}
      </figcaption>
    </figure>
  )
}

function Barcode({ code }: { code: string }) {
  return (
    <div>
      <div
        aria-hidden
        className="date-barcode"
      />
      <p className="text-muted mt-1 font-mono text-[10px] tracking-[0.25em]">
        {code}
      </p>
    </div>
  )
}

function SendInviteButton({ plan }: { plan: Plan }) {
  const { send, canSend } = useChatActions()
  const name = plan.student.firstName
  const message = `Draft an invite to ${name} for ${dayOf(plan.date)} at ${plan.slot.start} at ${plan.venue.name}`

  return (
    <button
      type="button"
      disabled={!canSend}
      onClick={() => send(message)}
      title={message}
      aria-label={`Send invite to ${name}`}
      className="date-cta motion-safe:animate-fade-up relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-linear-to-r from-rose-500 via-pink-600 to-fuchsia-600 px-4 py-2.5 text-white shadow-[0_10px_22px_-10px_rgb(225_29_72/0.8)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_-10px_rgb(225_29_72/0.9)] focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span
        aria-hidden
        className="text-xl leading-none"
      >
        💌
      </span>
      <span className="font-title text-2xl leading-none tracking-wide">
        Send invite
      </span>
      <span
        aria-hidden
        className="truncate text-xs text-white/80"
      >
        to {name} →
      </span>
    </button>
  )
}

function FoundTicket({ plan }: { plan: Plan }) {
  const kind = kindOf(plan.kind)
  const venueKind = venueKindOf(plan.venue.kind)
  const minutes = minutesOf(plan.slot.end) - minutesOf(plan.slot.start)
  const highlights = (plan.highlights ?? []).slice(0, 4)
  const why = plan.why ?? []
  const { venue } = plan

  return (
    <Ticket
      label={`${kind.label} with ${plan.student.firstName} on ${shortDate(plan.date)}, ${plan.slot.start} to ${plan.slot.end} at ${venue.name}`}
      main={
        <>
          <Band
            emoji={kind.emoji}
            eyebrow={kind.label}
            note={plan.note}
          >
            <YouAnd name={plan.student.firstName} />
          </Band>
          <div className="text-main-text space-y-4 px-4 pt-3 pb-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
              <Field label="Date">
                <span className="font-title text-heading text-3xl leading-none tracking-wide">
                  {shortDate(plan.date)}
                </span>
              </Field>
              <Field label="Time">
                <span className="font-title text-heading text-3xl leading-none tracking-wide whitespace-nowrap">
                  {plan.slot.start}
                  <span
                    aria-hidden
                    className="mx-1 text-rose-500"
                  >
                    –
                  </span>
                  <span className="sr-only"> to </span>
                  {plan.slot.end}
                </span>
                {minutes > 0 && (
                  <span className="text-muted ml-2 text-xs whitespace-nowrap">
                    {duration(minutes)}
                  </span>
                )}
              </Field>
              <Field
                label="Venue"
                className="col-span-2"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    role="img"
                    aria-label={venueKind.label}
                    className="text-lg leading-none"
                  >
                    {venueKind.emoji}
                  </span>
                  <span className="text-heading text-base font-bold">
                    {venue.name}
                  </span>
                  <span className="bg-heading/8 text-muted rounded-full px-2 py-0.5 text-[11px]">
                    {areaName(venue.area)}
                  </span>
                </div>
                {venue.expectedCrowd && (
                  <CrowdMeter crowd={venue.expectedCrowd} />
                )}
                {typeof venue.percentFull === 'number' && (
                  <OccupancyBar percent={venue.percentFull} />
                )}
              </Field>
            </dl>

            {highlights.length > 0 && (
              <section>
                <h4 className={LABEL}>On the menu</h4>
                <ul className="mt-1.5 space-y-1">
                  {highlights.map((dish, index) => (
                    <li
                      key={`${dish.name}-${index}`}
                      className="flex items-baseline gap-2"
                    >
                      <span className="min-w-0">{dish.name}</span>
                      <DietBadge dish={dish} />
                      <span
                        aria-hidden
                        className="border-muted/40 min-w-4 flex-1 border-b border-dotted"
                      />
                      {dish.priceEur !== undefined && (
                        <span className="text-heading shrink-0 font-bold tabular-nums">
                          {euro(dish.priceEur)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {why.length > 0 && (
              <section>
                <h4 className={LABEL}>Why it works</h4>
                <ul className="mt-1.5 space-y-1.5">
                  {why.map((reason, index) => (
                    <li
                      key={`${reason}-${index}`}
                      className="date-check flex items-start gap-2"
                      style={{ animationDelay: `${450 + index * 160}ms` }}
                    >
                      <span
                        aria-hidden
                        className="date-check__mark mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-linear-to-br from-rose-400 to-pink-600 text-[10px] font-bold text-white shadow-sm"
                      >
                        ✓
                      </span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <footer className="border-schedule-border-grey space-y-2 border-t border-dashed pt-3">
              {plan.caveat && (
                <p className="text-muted text-xs italic">{plan.caveat}</p>
              )}
              <SendInviteButton plan={plan} />
              <NextSteps
                steps={tweakSteps(plan)}
                title="Or tweak it"
              />
            </footer>
          </div>
        </>
      }
      stub={
        <div className="flex h-full flex-wrap content-between gap-x-4 gap-y-3 p-4 pt-5">
          <MiniMap venue={venue} />
          <div className="flex min-w-0 grow basis-40 flex-col justify-end gap-2">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="font-title text-heading text-3xl leading-none tracking-wider">
                  Admit 2
                </p>
                <p className={LABEL}>
                  {shortDate(plan.date)} · {plan.slot.start}
                </p>
              </div>
              <span
                aria-hidden
                className="text-2xl"
              >
                {kind.emoji}
              </span>
            </div>
            <Barcode code={ticketCode(plan)} />
          </div>
        </div>
      }
    />
  )
}

function NoDateTicket({ plan }: { plan: NoPlan }) {
  const kind = kindOf(plan.kind)

  return (
    <Ticket
      isFaded
      label={`No ${kind.label.toLowerCase()} with ${plan.student.firstName} on ${shortDate(plan.date)}`}
      main={
        <>
          <Band
            emoji={kind.emoji}
            eyebrow={kind.label}
            note={plan.note}
          >
            <YouAnd
              name={plan.student.firstName}
              isBroken
            />
          </Band>
          <div className="text-main-text space-y-3 px-4 pt-3 pb-5 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6">
              <Field label="Date">
                <span className="font-title text-muted text-3xl leading-none tracking-wide">
                  {shortDate(plan.date)}
                </span>
              </Field>
            </dl>
            <div className="bg-love-wash ring-love-line flex items-start gap-3 rounded-xl p-3 ring-1">
              <span
                role="img"
                aria-label="Heartbroken"
                className="date-fade-in text-3xl leading-none"
              >
                💔
              </span>
              <div>
                <p className="font-title text-heading text-xl tracking-wide">
                  No date this time
                </p>
                <p>{plan.reason}</p>
              </div>
            </div>
            <NextSteps
              title="Try instead"
              steps={[
                anotherDay(plan),
                {
                  label: '🕒 When are we free?',
                  message: `When are ${plan.student.firstName} and I both free this week?`,
                },
              ]}
            />
          </div>
        </>
      }
      stub={<VoidStub code={ticketCode(plan)} />}
    />
  )
}

function VoidStub({
  code,
  stamp = 'Not today',
}: {
  code: string
  stamp?: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5">
      <p className="date-stamp font-title rounded-md px-3 py-0.5 text-2xl tracking-[0.15em]">
        {stamp}
      </p>
      <p className="font-title text-muted text-2xl tracking-wider">Admit 0</p>
      <div className="w-full max-w-48">
        <Barcode code={code} />
      </div>
    </div>
  )
}

const TWISTS = [
  { label: '💸 Cheaper', kind: 'lunch', twist: 'budget' },
  { label: '🤫 Quieter', kind: 'study', twist: 'quiet' },
  { label: '🎉 More chaotic', kind: 'drinks', twist: 'chaos' },
] as const

const TONE_LABELS = {
  sweet: '💗 Sweet',
  absurd: '🧪 Absurd',
  'low-key': '😎 Low-key',
}

function DateExtras({
  plan,
  onAction,
  onCompose,
  actionsDisabled,
}: {
  plan: Plan
  onAction?: CardProps['onAction']
  onCompose?: CardProps['onCompose']
  actionsDisabled?: boolean
}) {
  const mission = plan.mission ?? []
  const drafts = plan.inviteDrafts ?? []

  return (
    <div className="space-y-3">
      {mission.length > 0 && (
        <section className="border-love-line bg-love-wash/80 rounded-2xl border p-4 text-sm">
          <h4 className="font-title text-heading text-xl">
            🎬 Your meet-cute mission
          </h4>
          <p className="text-muted text-xs">
            A playful suggestion for this fictional date.
          </p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-3">
            {mission.map((step, index) => (
              <li
                key={`${step.title}-${index}`}
                className="bg-surface rounded-xl p-3 shadow-sm"
              >
                <span className="text-love-text text-xs font-bold">
                  ACT {index + 1}
                </span>
                <h5 className="font-bold">{step.title}</h5>
                <p className="mt-1 text-xs">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {onAction && (
        <section className="border-blue-pretty/30 bg-blue-pretty/10 rounded-2xl border p-4 text-sm">
          <h4 className="font-title text-heading text-xl">🔀 Plot twist</h4>
          <p className="text-muted text-xs">
            Same person, same day, a different kind of date.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TWISTS.map(option => (
              <button
                key={option.twist}
                type="button"
                disabled={actionsDisabled}
                onClick={() =>
                  onAction(
                    `Replan my fictional demo date with ${plan.student.firstName} on ${plan.date}. Call plan_date with kind ${option.kind} and twist ${option.twist}. Show the new plan and say which parts are simulated.`
                  )
                }
                className="text-heading border-blue-pretty/30 bg-surface hover:bg-blue-pretty/15 rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {drafts.length > 0 && onCompose && (
        <section className="border-love-violet/30 bg-love-violet/10 rounded-2xl border p-4 text-sm">
          <h4 className="font-title text-heading text-xl">💌 Wingman drafts</h4>
          <p className="text-muted text-xs">
            Pick a tone, edit the draft, then ask before sending.
          </p>
          <div className="mt-2 space-y-2">
            {drafts.map(draft => (
              <div
                key={draft.tone}
                className="bg-surface rounded-xl p-3 shadow-sm"
              >
                <p className="text-xs font-bold">{TONE_LABELS[draft.tone]}</p>
                <p className="mt-1 text-xs">“{draft.message}”</p>
                <button
                  type="button"
                  disabled={actionsDisabled}
                  onClick={() =>
                    onCompose(
                      `Prepare an invite draft for ${plan.student.firstName} on ${plan.date} at ${plan.slot.start} at ${plan.venue.name}. Use this exact message: ${JSON.stringify(draft.message)}. Do not send it yet. Show me the full draft and ask me to confirm.`
                    )
                  }
                  className="bg-love-violet/15 text-heading hover:bg-love-violet/25 mt-2 rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50"
                >
                  Use this draft
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export function DatePlanCard({
  result,
  error,
  onAction,
  onCompose,
  actionsDisabled,
}: CardProps) {
  if (error || !isDatePlan(result)) {
    return (
      <Ticket
        isFaded
        label="Date plan failed"
        main={
          <>
            <Band
              emoji="🎟️"
              eyebrow="Date plan"
            >
              Couldn’t plan this date
            </Band>
            <p className="text-main-text px-4 pt-3 pb-5 text-sm">
              {error ?? 'The planner sent an answer this card can’t read.'}
            </p>
          </>
        }
        stub={
          <VoidStub
            code="QV · ERR"
            stamp="Void"
          />
        }
      />
    )
  }

  if (!result.found) return <NoDateTicket plan={result} />

  return (
    <div className="space-y-3">
      <FoundTicket plan={result} />
      <DateExtras
        plan={result}
        onAction={onAction}
        onCompose={onCompose}
        actionsDisabled={actionsDisabled}
      />
    </div>
  )
}
