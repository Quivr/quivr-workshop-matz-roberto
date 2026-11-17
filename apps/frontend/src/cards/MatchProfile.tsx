import { useId, useState } from 'react'

import { initials, shortDate, vars } from './format'
import { AREA_NAMES } from './LeuvenMap'
import type { MapArea } from './LeuvenMap'

export type SpotKind = 'restaurant' | 'library' | 'fakbar'

export type Match = {
  id: string
  firstName: string
  age: number
  gender: 'woman' | 'man' | 'non-binary'
  programme: string
  year: string
  score: number
  reasons: string[]
  interests: string[]
  bio: string
  icebreaker: string
  vibe: string
  lookingFor?: string
  funFacts: {
    coffeeOrder: string
    examSnack: string
    hotTake: string
    greenFlag: string
    karaokeSong: string
  }
  spot: { name: string; kind: SpotKind; area: MapArea }
  sharedFreeSlots: { date: string; start: string; end: string }[]
  photoUrl?: string
  featured?: boolean
  /** What they send right after you match. */
  matchMessages?: string[]
}

export type MatchesResult = {
  demo: true
  note: string
  center: { area: MapArea; label: string }
  window?: { from: string; to: string }
  me?: { programme: string; courses: string[] }
  matches: Match[]
}

/** Pin colour class (SVG fill), icon and legend label per kind of spot. */
export const KINDS: Record<
  SpotKind,
  { icon: string; fill: string; label: string }
> = {
  restaurant: { icon: '🍝', fill: 'fill-main', label: 'Restaurant' },
  library: { icon: '📚', fill: 'fill-blue-pretty', label: 'Library' },
  fakbar: { icon: '🍺', fill: 'fill-danger', label: 'Fakbar' },
}

/** Score at or above this gets the pink ring and the heart burst. */
export const HOT_SCORE = 85

const FACTS = [
  ['coffeeOrder', '☕', 'Coffee order'],
  ['examSnack', '🍿', 'Exam snack'],
  ['hotTake', '🌶️', 'Hot take'],
  ['greenFlag', '🟢', 'Green flag'],
  ['karaokeSong', '🎤', 'Karaoke song'],
] as const

const GRADIENTS = [
  ['#ffd750', '#ff9aa9'],
  ['#ff9aa9', '#c084fc'],
  ['#7dd3fc', '#ff9aa9'],
  ['#fda4af', '#fb7185'],
  ['#a7f3d0', '#7dd3fc'],
  ['#fcd34d', '#fb923c'],
]

const chip = 'motion-safe:animate-fade-up rounded-full px-2 py-0.5 text-xs'
const chipDelay = (index: number) =>
  vars({ animationDelay: `${150 + index * 60}ms` })

/** shortDate throws on a malformed date; a card should never crash on that. */
export const dayLabel = (date: string) => {
  try {
    return shortDate(date)
  } catch {
    return date
  }
}

const gradientOf = (seed: string) => {
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const [from, to] = GRADIENTS[hash % GRADIENTS.length] ?? [
    '#ffd750',
    '#ff9aa9',
  ]
  return `linear-gradient(135deg, ${from}, ${to})`
}

const AVATAR_SIZES = {
  sm: 'size-8 text-base ring-2',
  md: 'size-12 text-2xl ring-2',
  lg: 'size-16 text-3xl ring-4',
}

/** Avatar: the photo when there is one (and it loads), else initials on a gradient. */
export function Avatar({
  name,
  size = 'md',
  className = '',
  photoUrl,
}: {
  name: string
  size?: keyof typeof AVATAR_SIZES
  className?: string
  photoUrl?: string
}) {
  const [isBroken, setIsBroken] = useState(false)
  const hasPhoto = Boolean(photoUrl) && !isBroken

  return (
    <span
      aria-hidden
      className={`font-title text-sidenav-blue ring-surface inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full leading-none shadow-md ${hasPhoto ? '' : 'pt-0.5'} ${AVATAR_SIZES[size]} ${className}`}
      style={{ background: gradientOf(name) }}
    >
      {hasPhoto ? (
        <img
          src={photoUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setIsBroken(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const value = Math.min(100, Math.max(0, score))
  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Compatibility"
      className="score-ring motion-safe:animate-count-up size-14 shrink-0"
      style={vars({
        '--score': value,
        '--ring':
          value >= HOT_SCORE
            ? 'var(--color-love)'
            : 'var(--color-green-status)',
      })}
    />
  )
}

function MoreDetails({ match }: { match: Match }) {
  const interests = match.interests ?? []
  const slots = match.sharedFreeSlots ?? []

  return (
    <div className="motion-safe:animate-fade-up space-y-2.5 pt-1">
      {match.lookingFor && (
        <p className="from-main/30 text-heading to-love/25 rounded-lg bg-linear-to-r px-3 py-1.5 text-xs">
          💞 Looking for <b>{match.lookingFor}</b>
        </p>
      )}
      {match.bio && <p className="text-xs">{match.bio}</p>}
      {interests.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {interests.map((interest, index) => (
            <li
              key={`${interest}-${index}`}
              className="border-schedule-border-grey bg-surface/80 rounded-full border px-2 py-0.5 text-[11px]"
            >
              #{interest}
            </li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {FACTS.map(([key, icon, label]) => (
          <div
            key={key}
            className="contents"
          >
            <dt className="text-muted whitespace-nowrap">
              {icon} {label}
            </dt>
            <dd className="font-bold">{match.funFacts?.[key]}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-1 text-xs font-bold">Free together</p>
        {slots.length === 0 && (
          <p className="text-xs">No shared free slots found.</p>
        )}
        <ul className="flex flex-wrap gap-1">
          {slots.map(slot => (
            <li
              key={`${slot.date}-${slot.start}`}
              className="bg-sidenav-blue rounded-full px-2 py-0.5 text-[11px] text-white shadow-sm"
            >
              🗓️ {dayLabel(slot.date)} · {slot.start}–{slot.end}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Goofy sticker over a blurred profile. The button opens the paywall. */
function LockedSticker({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="absolute inset-0 z-[3] grid place-items-center p-4">
      <div className="swipe-sticker ring-main flex flex-col items-center gap-2 rounded-2xl bg-[color-mix(in_srgb,var(--color-main)_20%,var(--color-surface))] px-4 py-3 text-center shadow-xl ring-2">
        <p className="font-title text-heading text-2xl leading-none tracking-wide">
          🕵️ WHO IS THIS??
        </p>
        <p className="text-[11px]">
          A mysterious stranger. Could be your soulmate. Could be your TA.
        </p>
        <button
          type="button"
          onClick={onUnlock}
          className="swipe-wobble from-love-hot to-love-deep rounded-full bg-linear-to-r px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:shadow-lg focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          🕶️ Unblur with X-Ray Goggles
        </button>
      </div>
    </div>
  )
}

type MatchProfileProps = {
  match: Match
  /** Behind the paywall: blurred, "???" and a sticker. */
  isLocked?: boolean
  onUnlock?: () => void
}

/** Compact profile: the face of a swipe card. Fun facts and slots hide behind "More". */
export function MatchProfile({
  match,
  isLocked = false,
  onUnlock = () => undefined,
}: MatchProfileProps) {
  const [isOpen, setIsOpen] = useState(false)
  const detailsId = useId()
  const kind = KINDS[match.spot.kind] ?? KINDS.restaurant
  const reasons = (match.reasons ?? []).slice(0, 3)

  return (
    <article
      aria-label={
        isLocked ? 'Mystery profile' : `Profile of ${match.firstName}`
      }
      className="relative"
    >
      {isLocked && <LockedSticker onUnlock={onUnlock} />}
      <div
        aria-hidden={isLocked || undefined}
        inert={isLocked}
        className={`swipe-reveal space-y-2.5 p-3.5 ${isLocked ? 'is-locked' : ''}`}
      >
        <MatchFace
          match={match}
          isLocked={isLocked}
          kind={kind}
          reasons={reasons}
        />
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={detailsId}
          onClick={() => setIsOpen(value => !value)}
          className="text-muted hover:bg-love-wash hover:text-love-text rounded-full px-2 py-0.5 text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:outline-none"
        >
          {isOpen ? 'Less ▴' : 'More ▾'}
        </button>
        <div id={detailsId}>
          {isOpen && !isLocked && <MoreDetails match={match} />}
        </div>
      </div>
    </article>
  )
}

type MatchFaceProps = {
  match: Match
  isLocked: boolean
  kind: (typeof KINDS)[SpotKind]
  reasons: string[]
}

function MatchFace({ match, isLocked, kind, reasons }: MatchFaceProps) {
  return (
    <>
      <header className="flex items-center gap-3">
        <Avatar
          name={isLocked ? '?' : match.firstName}
          size="lg"
          photoUrl={isLocked ? undefined : match.photoUrl}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-title text-heading text-[1.7rem] leading-none">
            {isLocked ? '???' : match.firstName}, {match.age}
          </h3>
          <p className="truncate text-xs">
            {match.programme} · {match.year}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className="bg-green-status size-2 shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
            />
            <span className="truncate italic">{match.vibe}</span>
          </p>
        </div>
        {isLocked ? (
          <div className="font-title text-heading ring-heading/10 grid size-14 shrink-0 place-items-center rounded-full text-2xl ring-[6px] ring-inset">
            ??%
          </div>
        ) : (
          <ScoreRing score={match.score} />
        )}
      </header>

      {reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {reasons.map((reason, i) => (
            <li
              key={`${reason}-${i}`}
              className={`${chip} bg-main/40 text-heading`}
              style={chipDelay(i)}
            >
              ✨ {reason}
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted text-xs">
        {kind.icon} {match.spot.name} ·{' '}
        {AREA_NAMES[match.spot.area] ?? match.spot.area}
      </p>

      <p className="from-love-wash to-love-wash-2 text-love-ink relative ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-sm bg-linear-to-br px-3 py-2 text-xs shadow-sm">
        <span className="sr-only">Suggested opening line: </span>“
        {match.icebreaker}”
      </p>
    </>
  )
}
