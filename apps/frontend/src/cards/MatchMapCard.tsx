import { useEffect, useState } from 'react'

import { useWallet } from '../wallet'
import { DemoBadge } from './DemoBadge'
import { vars } from './format'
import {
  LeuvenMap,
  MAP_HEIGHT,
  MAP_WIDTH,
  PinShape,
  pointOf,
  ScanLayer,
  YouMarker,
  youPoint,
} from './LeuvenMap'
import { dayLabel, HOT_SCORE, KINDS } from './MatchProfile'
import type { Match, MatchesResult } from './MatchProfile'
import { SwipeDeck, SwipeDeckSkeleton, useSwipeDeck } from './SwipeDeck'
import type { Verdict } from './SwipeDeck'
import type { CardProps } from './types'

const SCAN_MESSAGES = [
  'Scanning Leuven for study buddies…',
  'Detecting suspicious Alma lasagne enthusiasm…',
  'Calibrating chemistry sensors…',
  'Ignoring everyone who says ‘it’s complicated’…',
  'Checking who also skipped the 8:30 lecture…',
  'Bribing the library occupancy counter…',
]

/** Tools answer in milliseconds; scan at least this long so the radar is seen. */
const MIN_SCAN_MS = 2600
const TICK_MS = 2000
const POP_START_MS = 150
const POP_STAGGER_MS = 320
/** A pin has landed about this long after its pop starts. */
const LAND_MS = 330
const PIN_SPREAD = 64

const BURST = ['❤️', '💛', '💖', '✨', '💗', '❤️'].map((icon, i) => {
  const angle = ((-160 + i * 28) * Math.PI) / 180
  return {
    icon,
    dx: Math.round(Math.cos(angle) * 30),
    dy: Math.round(Math.sin(angle) * 30 - 8),
    rot: i % 2 ? 24 : -24,
  }
})

/** Literal class names so Tailwind can see them. */
const GLOWS = {
  hot: ['fill-love/15', 'fill-love/25', 'fill-love/35'],
  normal: ['fill-main/15', 'fill-main/25', 'fill-main/35'],
}

type Phase = 'scanning' | 'revealing' | 'done'

const isMatchesResult = (value: unknown): value is MatchesResult =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as MatchesResult).matches)

/** scanning → (result and minimum scan time) → revealing (pins pop) → done. */
function useScanPhase(isPending: boolean, pinCount: number): Phase {
  const [isMinScanOver, setIsMinScanOver] = useState(!isPending)
  const [isSettled, setIsSettled] = useState(false)
  const isRevealed = !isPending && isMinScanOver

  useEffect(() => {
    if (isMinScanOver) return
    const timer = setTimeout(() => setIsMinScanOver(true), MIN_SCAN_MS)
    return () => clearTimeout(timer)
  }, [isMinScanOver])

  useEffect(() => {
    if (!isRevealed || pinCount === 0) return
    const timer = setTimeout(
      () => setIsSettled(true),
      POP_START_MS + pinCount * POP_STAGGER_MS + 800
    )
    return () => clearTimeout(timer)
  }, [isRevealed, pinCount])

  if (!isRevealed) return 'scanning'
  return isSettled ? 'done' : 'revealing'
}

function useTicker(isActive: boolean) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isActive) return
    const timer = setInterval(() => setTick(value => value + 1), TICK_MS)
    return () => clearInterval(timer)
  }, [isActive])

  return tick
}

/** "Matches found" counter: ticks up as each pin lands. */
function useFound(isRevealed: boolean, count: number) {
  const [found, setFound] = useState(0)

  useEffect(() => {
    if (!isRevealed) return
    const timers = Array.from({ length: count }, (_, i) =>
      setTimeout(
        () => setFound(i + 1),
        POP_START_MS + i * POP_STAGGER_MS + LAND_MS
      )
    )
    return () => timers.forEach(clearTimeout)
  }, [isRevealed, count])

  return isRevealed ? found : 0
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/** Pins sharing an area fan out in a zigzag row so labels don't overlap. */
function layoutPins(matches: Match[]) {
  return matches
    .map((match, rank) => {
      const group = matches.filter(item => item.spot.area === match.spot.area)
      const index = group.indexOf(match)
      const base = pointOf(match.spot.area)
      const zigzag = group.length === 1 ? 0 : index % 2 === 0 ? -10 : 18
      return {
        match,
        rank,
        x: clamp(
          base.x + (index - (group.length - 1) / 2) * PIN_SPREAD,
          40,
          MAP_WIDTH - 40
        ),
        y: clamp(base.y + zigzag, 40, MAP_HEIGHT - 22),
      }
    })
    .sort((a, b) => a.y - b.y)
}

type PinProps = {
  match: Match
  x: number
  y: number
  rank: number
  isSelected: boolean
  verdict?: Verdict
  /** Behind the paywall: "?" instead of name and score. */
  isLocked: boolean
  onSelect: () => void
}

const VERDICT_LABELS: Record<Verdict, string> = {
  like: ', liked',
  super: ', super liked',
  nope: ', passed',
}

function Pin({
  match,
  x,
  y,
  rank,
  isSelected,
  verdict,
  isLocked,
  onSelect,
}: PinProps) {
  const kind = KINDS[match.spot.kind] ?? KINDS.restaurant
  const isHot = match.score >= HOT_SCORE
  const delay = POP_START_MS + rank * POP_STAGGER_MS
  const score = String(match.score)
  const labelWidth = isLocked
    ? 22
    : (match.firstName.length + score.length) * 5.6 + 14
  const glow = isHot ? GLOWS.hot : GLOWS.normal
  const isLiked = verdict === 'like' || verdict === 'super'
  const label = isLocked
    ? `Mystery match at ${match.spot.name}. Locked, unblur with X-Ray Goggles`
    : `${match.firstName}, ${match.score}% match, ${match.vibe}, at ${match.spot.name}${verdict ? VERDICT_LABELS[verdict] : ''}`

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={`transition-opacity duration-300 ${verdict === 'nope' ? 'opacity-35' : ''}`}
    >
      <g
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={isSelected}
        onClick={onSelect}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        }}
        className="group cursor-pointer outline-none"
      >
        <g
          className="motion-safe:animate-pop"
          style={{ animationDelay: `${delay}ms` }}
        >
          <ellipse
            rx={8}
            ry={3}
            className="fill-black/20"
          />
          <ellipse
            rx={14}
            ry={6}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            className="stroke-blue-pretty motion-safe:animate-ping-once fill-none opacity-0"
            style={{ animationDelay: `${delay + LAND_MS}ms` }}
          />
          <g
            className={`transition-transform duration-200 ${isSelected ? 'scale-125' : 'scale-100 group-hover:-translate-y-1 group-hover:scale-110 group-hover:-rotate-3'}`}
          >
            {isSelected && (
              <g
                transform="translate(0 -24)"
                className="motion-safe:animate-glow"
              >
                {[27, 22, 18].map((r, i) => (
                  <circle
                    key={r}
                    r={r}
                    className={glow[i]}
                  />
                ))}
              </g>
            )}
            <circle
              cy={-24}
              r={17}
              strokeWidth={2.5}
              className="stroke-blue-pretty fill-none opacity-0 group-focus-visible:opacity-100"
            />
            <PinShape
              fill={kind.fill}
              icon={kind.icon}
              isSelected={isSelected}
            />
            <g transform="translate(0 12)">
              <rect
                x={-labelWidth / 2}
                width={labelWidth}
                height={15}
                rx={7.5}
                strokeWidth={1}
                className={`fill-white ${isSelected ? 'stroke-sidenav-blue' : 'stroke-schedule-border-grey'}`}
              />
              <text
                y={7.5}
                dy="0.35em"
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                className="fill-sidenav-blue"
              >
                {isLocked ? (
                  '?'
                ) : (
                  <>
                    {match.firstName}{' '}
                    <tspan className="fill-vegan">{score}</tspan>
                  </>
                )}
              </text>
            </g>
            {isLiked && (
              <g transform="translate(11 -37)">
                <g className="motion-safe:animate-pop">
                  <circle
                    r={6.5}
                    strokeWidth={1.5}
                    className="fill-white stroke-pink-500"
                  />
                  <text
                    dy="0.35em"
                    textAnchor="middle"
                    fontSize={8}
                    className="fill-pink-500"
                  >
                    {verdict === 'super' ? '★' : '♥'}
                  </text>
                </g>
              </g>
            )}
          </g>
          {isHot && (
            <g
              transform="translate(0 -24)"
              pointerEvents="none"
            >
              {BURST.map(({ icon, dx, dy, rot }, i) => (
                <text
                  key={i}
                  textAnchor="middle"
                  fontSize={10}
                  className="motion-safe:animate-burst opacity-0"
                  style={vars({
                    '--dx': `${dx}px`,
                    '--dy': `${dy}px`,
                    '--rot': `${rot}deg`,
                    animationDelay: `${delay + LAND_MS + 50}ms`,
                  })}
                >
                  {icon}
                </text>
              ))}
            </g>
          )}
        </g>
      </g>
    </g>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {Object.values(KINDS).map(kind => (
        <li key={kind.label}>
          {kind.icon} {kind.label}
        </li>
      ))}
    </ul>
  )
}

function MatchScene({
  data,
  isPending,
}: {
  data?: MatchesResult
  isPending: boolean
}) {
  const matches = data?.matches ?? []
  const phase = useScanPhase(isPending, matches.length)
  const tick = useTicker(phase === 'scanning')
  const wallet = useWallet()
  const deck = useSwipeDeck(matches)
  const selected = deck.focus
  const isLocked = (match: Match) => !wallet.canSee(matches.indexOf(match))
  const isScanning = phase === 'scanning'
  const found = useFound(!isScanning, matches.length)
  const isEmpty = !isScanning && matches.length === 0
  // The result (and so "you") is unknown while pending: sweep the middle.
  const radar = data?.center
    ? youPoint(data.center.area)
    : { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }
  const summary = isScanning
    ? 'Scanning Leuven…'
    : isEmpty
      ? 'Nobody on the radar'
      : `${matches.length} ${matches.length === 1 ? 'match' : 'matches'} nearby · swipe or tap a pin`

  return (
    <div className="shadow-sidenav-blue/10 from-surface overflow-hidden rounded-xl bg-linear-to-br via-[color-mix(in_srgb,var(--color-main)_12%,var(--color-surface))] to-[color-mix(in_srgb,var(--color-blue-pretty)_12%,var(--color-surface))] shadow-lg">
      <div className="from-sidenav-blue to-sidenav-secondary flex items-baseline justify-between bg-linear-to-r px-3 py-1.5 text-white">
        <span className="font-title text-xl tracking-wide">Matches nearby</span>
        <span className="text-xs opacity-80">
          {data?.center ? `Leuven · ${data.center.label}` : 'Leuven'}
        </span>
      </div>
      <div className="space-y-3 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <DemoBadge note={data?.note} />
          {data?.me && (
            <span>
              You · {data.me.programme}
              {(data.me.courses ?? []).length > 0 &&
                ` · ${(data.me.courses ?? []).slice(0, 3).join(', ')}`}
            </span>
          )}
          {data?.window && (
            <span className="ml-auto">
              🗓️ {dayLabel(data.window.from)} → {dayLabel(data.window.to)}
            </span>
          )}
        </div>

        <div className="border-schedule-border-grey relative overflow-hidden rounded-xl border shadow-inner">
          <LeuvenMap>
            <ScanLayer
              x={radar.x}
              y={radar.y}
              isSlow={isEmpty}
              isFading={phase === 'done'}
            />
            {!isScanning &&
              layoutPins(matches).map(pin => (
                <Pin
                  key={pin.match.id}
                  {...pin}
                  isSelected={pin.match.id === selected?.id}
                  verdict={deck.verdicts[pin.match.id]}
                  isLocked={isLocked(pin.match)}
                  onSelect={() =>
                    isLocked(pin.match)
                      ? wallet.openPaywall('locked-profile')
                      : deck.select(pin.match.id)
                  }
                />
              ))}
            {!isScanning && data?.center && (
              <YouMarker
                area={data.center.area}
                label={data.center.label}
              />
            )}
          </LeuvenMap>
          {isScanning && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-2 top-2 flex justify-center"
            >
              <p
                key={tick}
                className="bg-sidenav-blue/90 motion-safe:animate-ticker rounded-full px-3 py-1 text-center text-xs text-white shadow-lg backdrop-blur"
              >
                {SCAN_MESSAGES[tick % SCAN_MESSAGES.length]}
              </p>
            </div>
          )}
          {!isScanning && matches.length > 0 && (
            <p
              aria-hidden
              className="font-title bg-sidenav-blue/85 pointer-events-none absolute right-2 bottom-2 rounded-md px-2 py-0.5 text-sm tracking-wider text-white shadow-lg backdrop-blur"
            >
              MATCHES FOUND:{' '}
              <span
                key={found}
                className="text-main motion-safe:animate-fade-up inline-block"
              >
                {found}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <Legend />
          <p
            role="status"
            className="text-xs font-bold"
          >
            {summary}
          </p>
        </div>

        {isEmpty && (
          <p className="bg-surface/70 rounded-xl p-3 text-center shadow-sm">
            🔭 Nobody on the radar right now. Try a different area or loosen
            your preferences, then ask again.
          </p>
        )}
        {(isScanning || matches.length > 0) && (
          <div className="relative isolate">
            <div
              aria-hidden
              className="bg-main/50 motion-safe:animate-aurora absolute -top-3 -left-3 -z-10 size-32 rounded-full blur-2xl"
            />
            <div
              aria-hidden
              className="motion-safe:animate-aurora bg-love/30 absolute -right-3 -bottom-3 -z-10 size-40 rounded-full blur-2xl"
            />
            {isScanning ? (
              <SwipeDeckSkeleton />
            ) : (
              <SwipeDeck
                deck={deck}
                isLocked={isLocked}
              />
            )}
          </div>
        )}
        {data && <p className="text-muted text-[11px]">🧪 {data.note}</p>}
      </div>
    </div>
  )
}

/** Mounts while the tool runs (`result` is undefined) and keeps its state when the result arrives. */
export function MatchMapCard({ result, isPending }: CardProps) {
  const data = isMatchesResult(result) ? result : undefined
  if (!isPending && !data) return null

  return (
    <MatchScene
      data={data}
      isPending={isPending}
    />
  )
}
