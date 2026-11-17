import './swipe-deck.css'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'

import { useWallet } from '../wallet'
import { vars } from './format'
import { Avatar, MatchProfile } from './MatchProfile'
import type { Match } from './MatchProfile'
import { NextSteps } from './NextSteps'
import type { NextStep } from './NextSteps'

export type Verdict = 'like' | 'super' | 'nope'

/** Release past this many px, or flick, to swipe. */
const THRESHOLD = 100
/** px per ms */
const FLICK_SPEED = 0.5
const FLICK_MIN_PX = 30
/** Dragging a locked card this far opens the paywall. */
const LOCKED_TUG_PX = 40
const FLY_MS = 320
const CELEBRATE_MS = 1500
const PEEK = 2

const burstOf = (icons: string[]) =>
  icons.map((icon, i) => {
    const angle = (i / icons.length) * Math.PI * 2 - Math.PI / 2
    return {
      icon,
      dx: Math.round(Math.cos(angle) * 58),
      dy: Math.round(Math.sin(angle) * 58),
      rot: i % 2 ? 30 : -30,
    }
  })

const HEART_BURST = burstOf(['❤️', '💖', '✨', '💗', '❤️', '💕', '✨', '💘'])
const STAR_BURST = burstOf(['⭐', '✨', '🌟', '⭐', '✨', '🌟', '⭐', '✨'])

const END_STEPS: NextStep[] = [
  {
    label: '🧗 Someone who likes climbing',
    message: 'Find me someone who likes climbing',
  },
  { label: '📚 A study buddy', message: 'Find me a study buddy in my courses' },
  { label: '🎉 What’s on tonight?', message: "What's on tonight?" },
]

const matchSteps = (name: string): NextStep[] => [
  {
    label: '🕒 When are we free?',
    message: `When are ${name} and I both free this week?`,
  },
  { label: '🍝 Lunch', message: `Plan a lunch with ${name} this week` },
  { label: '🍷 Dinner', message: `Plan a dinner with ${name} this week` },
  {
    label: '📚 Study date',
    message: `Plan a study session with ${name} this week`,
  },
  { label: '🍻 Drinks', message: `Plan drinks with ${name} this week` },
]

const LOCAL_PILL =
  'bg-sidenav-blue rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-1 focus-visible:outline-none active:translate-y-0'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const isReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const omit = (record: Record<string, Verdict>, id: string) =>
  Object.fromEntries(Object.entries(record).filter(([key]) => key !== id))

/** Local swipe state, shared with the map. Nothing is sent to the chat. */
export function useSwipeDeck(matches: Match[]) {
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
  const [history, setHistory] = useState<string[]>([])
  const [frontId, setFrontId] = useState<string>()
  const [celebratingId, setCelebratingId] = useState<string>()
  const [openId, setOpenId] = useState<string>()
  const [announcement, setAnnouncement] = useState('')

  const find = (id?: string) => matches.find(match => match.id === id)
  const undecided = matches.filter(match => !verdicts[match.id])
  const front = undecided.find(match => match.id === frontId)
  const queue = front
    ? [front, ...undecided.filter(match => match !== front)]
    : undecided
  const likes = history.flatMap(id => {
    const match = find(id)
    return match && verdicts[id] !== 'nope' ? [match] : []
  })
  const celebrating = find(celebratingId)
  const open = find(openId)

  useEffect(() => {
    if (!celebratingId) return
    const timer = setTimeout(() => {
      setOpenId(celebratingId)
      setCelebratingId(undefined)
    }, CELEBRATE_MS)
    return () => clearTimeout(timer)
  }, [celebratingId])

  const swipe = (match: Match, verdict: Verdict) => {
    setVerdicts(value => ({ ...value, [match.id]: verdict }))
    setHistory(value => [...value.filter(id => id !== match.id), match.id])
    setFrontId(undefined)
    setOpenId(undefined)
    if (verdict === 'nope') {
      setAnnouncement(`Passed on ${match.firstName}`)
      return
    }
    setAnnouncement(
      `${verdict === 'super' ? 'Super liked' : 'Liked'} ${match.firstName}. It’s a match!`
    )
    setCelebratingId(match.id)
  }

  const undo = () => {
    const id = history.at(-1)
    const match = find(id)
    if (!id || !match) return
    setVerdicts(value => omit(value, id))
    setHistory(value => value.slice(0, -1))
    setFrontId(id)
    setOpenId(undefined)
    setCelebratingId(undefined)
    setAnnouncement(`Undo: ${match.firstName} is back on top`)
  }

  /** From the map: liked people reopen their options, others go on top. */
  const select = (id: string) => {
    const verdict = verdicts[id]
    setCelebratingId(undefined)
    if (verdict && verdict !== 'nope') {
      setOpenId(id)
      return
    }
    if (verdict === 'nope') {
      setVerdicts(value => omit(value, id))
      setHistory(value => value.filter(item => item !== id))
    }
    setOpenId(undefined)
    setFrontId(id)
  }

  const openMatch = (id: string) => {
    setCelebratingId(undefined)
    setOpenId(id)
  }

  const reset = () => {
    setVerdicts({})
    setHistory([])
    setFrontId(undefined)
    setOpenId(undefined)
    setCelebratingId(undefined)
    setAnnouncement('Deck reshuffled. Everyone is back.')
  }

  return {
    queue,
    verdicts,
    likes,
    celebrating,
    open,
    /** The person in focus, highlighted on the map. */
    focus: celebrating ?? open ?? queue[0],
    announcement,
    announce: setAnnouncement,
    canUndo: history.length > 0,
    swipe,
    undo,
    select,
    openMatch,
    closeMatch: () => setOpenId(undefined),
    reset,
  }
}

export type SwipeDeckState = ReturnType<typeof useSwipeDeck>

type Drag = {
  pointerId: number
  startX: number
  startY: number
  dx: number
  dy: number
  lastX: number
  lastT: number
  vx: number
  isTilted: boolean
  isLocked: boolean
}

type SwipeDeckProps = {
  deck: SwipeDeckState
  /** Blurred behind the paywall: can't be swiped. */
  isLocked: (match: Match) => boolean
}

export function SwipeDeck({ deck, isLocked }: SwipeDeckProps) {
  const wallet = useWallet()
  const stackRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const isLeaving = useRef(false)
  const flyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const timer = flyTimer
    return () => clearTimeout(timer.current)
  }, [])

  const top = deck.queue[0]
  const visible = deck.queue.slice(0, PEEK + 1)
  const isCelebrating = Boolean(deck.celebrating)
  const isOpen = Boolean(deck.open) && !isCelebrating

  const paint = (dx: number, dy: number, isTilted: boolean) => {
    const card = topRef.current
    if (!card) return
    card.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${isTilted ? dx * 0.06 : 0}deg)`
    card.style.setProperty('--like', String(clamp01(dx / THRESHOLD)))
    card.style.setProperty('--nope', String(clamp01(-dx / THRESHOLD)))
    stackRef.current?.style.setProperty(
      '--progress',
      String(clamp01(Math.abs(dx) / THRESHOLD))
    )
  }

  const springBack = () => {
    const card = topRef.current
    if (card) {
      card.style.transition = isReducedMotion()
        ? 'none'
        : 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)'
      card.style.transform = ''
      card.style.setProperty('--like', '0')
      card.style.setProperty('--nope', '0')
    }
    stackRef.current?.style.setProperty('--progress', '0')
  }

  const fling = (verdict: Verdict, dy = 0) => {
    if (!top || isLeaving.current || isCelebrating) return
    if (isLocked(top)) {
      springBack()
      wallet.openPaywall('locked-profile')
      return
    }
    const isPaid =
      verdict === 'super' ? wallet.spendSuperLike() : wallet.spendSwipe()
    if (!isPaid) {
      springBack()
      deck.announce(
        verdict === 'super'
          ? 'Out of super likes. Cupid needs a top-up.'
          : 'Out of free swipes. Your thumb needs a top-up.'
      )
      return
    }

    const card = topRef.current
    const stack = stackRef.current
    if (!card || !stack || isReducedMotion()) {
      stack?.style.setProperty('--progress', '0')
      deck.swipe(top, verdict)
      return
    }

    isLeaving.current = true
    const dir = verdict === 'nope' ? -1 : 1
    card.style.transition = `transform ${FLY_MS}ms cubic-bezier(0.4, 0, 1, 1), opacity ${FLY_MS}ms ease-in`
    card.style.transform =
      verdict === 'super'
        ? `translate3d(0, ${-card.offsetHeight * 1.3}px, 0) scale(0.9)`
        : `translate3d(${dir * card.offsetWidth * 1.4}px, ${dy + 40}px, 0) rotate(${dir * 28}deg)`
    card.style.opacity = '0'
    card.style.setProperty('--like', verdict === 'like' ? '1' : '0')
    card.style.setProperty('--nope', verdict === 'nope' ? '1' : '0')
    card.style.setProperty('--super', verdict === 'super' ? '1' : '0')
    stack.style.setProperty('--progress', '1')
    const match = top
    flyTimer.current = setTimeout(() => {
      isLeaving.current = false
      stack.style.setProperty('--progress', '0')
      deck.swipe(match, verdict)
    }, FLY_MS)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isLeaving.current || isCelebrating || !top) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if ((event.target as Element).closest('button, a')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.style.transition = 'none'
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      lastX: event.clientX,
      lastT: event.timeStamp,
      vx: 0,
      isTilted: !isReducedMotion(),
      isLocked: isLocked(top),
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    const resistance = state.isLocked ? 0.3 : 1
    state.dx = (event.clientX - state.startX) * resistance
    state.dy = (event.clientY - state.startY) * 0.25 * resistance
    const dt = event.timeStamp - state.lastT
    if (dt > 0) state.vx = (event.clientX - state.lastX) / dt
    state.lastX = event.clientX
    state.lastT = event.timeStamp
    paint(state.dx, state.dy, state.isTilted)
  }

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    if (event.type === 'pointercancel') return springBack()
    if (state.isLocked) {
      springBack()
      if (Math.abs(state.dx) > LOCKED_TUG_PX * 0.3) {
        wallet.openPaywall('locked-profile')
      }
      return
    }
    const isRecent = event.timeStamp - state.lastT < 100
    const isFlick =
      isRecent &&
      Math.abs(state.vx) > FLICK_SPEED &&
      Math.abs(state.dx) > FLICK_MIN_PX &&
      Math.sign(state.vx) === Math.sign(state.dx)
    if (Math.abs(state.dx) > THRESHOLD || isFlick) {
      fling(state.dx > 0 ? 'like' : 'nope', state.dy)
      return
    }
    springBack()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isOpen || (event.target as Element).closest('button')) return
    const key = event.key
    if (key === 'Backspace' || key === 'z' || key === 'Z') {
      if (!isLeaving.current) deck.undo()
    } else if (key === 'ArrowLeft') fling('nope')
    else if (key === 'ArrowRight') fling('like')
    else if (key === 'ArrowUp') fling('super')
    else return
    event.preventDefault()
  }

  return (
    <section
      aria-label="Swipe through your matches"
      onKeyDown={onKeyDown}
      className="space-y-3"
    >
      {deck.likes.length > 0 && (
        <Likes
          likes={deck.likes}
          verdicts={deck.verdicts}
          openId={isOpen ? deck.open?.id : undefined}
          onOpen={deck.openMatch}
        />
      )}

      {isOpen && deck.open ? (
        <MatchedPanel
          key={deck.open.id}
          match={deck.open}
          isSuper={deck.verdicts[deck.open.id] === 'super'}
          onBack={deck.closeMatch}
        />
      ) : (
        <div className="grid">
          {top ? (
            <div
              ref={stackRef}
              tabIndex={0}
              role="group"
              aria-roledescription="card stack"
              aria-label={`${isLocked(top) ? 'Mystery profile' : top.firstName}, ${deck.queue.length} left. Arrow right to like, left to pass, up to super like, Z to undo.`}
              className="swipe-stack col-start-1 row-start-1"
            >
              {visible.map((match, depth) => (
                <div
                  key={match.id}
                  ref={depth === 0 ? topRef : undefined}
                  className={`swipe-card ${depth === 0 ? 'swipe-card--top' : ''}`}
                  style={vars({
                    '--depth': depth,
                    zIndex: visible.length - depth,
                  })}
                  inert={depth > 0}
                  aria-hidden={depth > 0 || undefined}
                  onPointerDown={depth === 0 ? onPointerDown : undefined}
                  onPointerMove={depth === 0 ? onPointerMove : undefined}
                  onPointerUp={depth === 0 ? onPointerEnd : undefined}
                  onPointerCancel={depth === 0 ? onPointerEnd : undefined}
                >
                  {depth === 0 && <Stamps />}
                  <MatchProfile
                    match={match}
                    isLocked={isLocked(match)}
                    onUnlock={() => wallet.openPaywall('locked-profile')}
                  />
                </div>
              ))}
            </div>
          ) : (
            !isCelebrating && (
              <EndOfDeck
                likes={deck.likes.length}
                onReset={deck.reset}
              />
            )
          )}
          {deck.celebrating && (
            <Celebration
              key={deck.celebrating.id}
              match={deck.celebrating}
              isSuper={deck.verdicts[deck.celebrating.id] === 'super'}
            />
          )}
        </div>
      )}

      {!isOpen && (top || deck.canUndo) && (
        <Controls
          top={top}
          isBusy={isCelebrating}
          canUndo={deck.canUndo}
          onUndo={deck.undo}
          onSwipe={fling}
        />
      )}

      <p
        aria-live="polite"
        className="sr-only"
      >
        {deck.announcement}
      </p>
    </section>
  )
}

function Stamps() {
  return (
    <>
      <span
        aria-hidden
        className="swipe-stamp swipe-stamp--like"
      >
        LIKE ♥
      </span>
      <span
        aria-hidden
        className="swipe-stamp swipe-stamp--nope"
      >
        NOPE ✕
      </span>
      <span
        aria-hidden
        className="swipe-stamp swipe-stamp--super"
      >
        SUPER ⭐
      </span>
    </>
  )
}

type RoundButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean
  className: string
  children: ReactNode
}

function RoundButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: RoundButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`swipe-btn ${className}`}
    >
      <span aria-hidden>{children}</span>
    </button>
  )
}

type ControlsProps = {
  top?: Match
  isBusy: boolean
  canUndo: boolean
  onUndo: () => void
  onSwipe: (verdict: Verdict) => void
}

function Controls({ top, isBusy, canUndo, onUndo, onSwipe }: ControlsProps) {
  const wallet = useWallet()
  const name = top?.firstName ?? 'this person'
  const isDisabled = !top || isBusy
  const { swipes, superLikes } = wallet.state

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-center gap-3">
        <RoundButton
          label="Undo last swipe"
          onClick={onUndo}
          disabled={!canUndo || isBusy}
          className="size-9 text-base text-amber-500"
        >
          ↺
        </RoundButton>
        <RoundButton
          label={`Pass on ${name}`}
          onClick={() => onSwipe('nope')}
          disabled={isDisabled}
          className="size-14 text-2xl font-bold text-rose-500"
        >
          ✕
        </RoundButton>
        <RoundButton
          label={`Super like ${name}`}
          onClick={() => onSwipe('super')}
          disabled={isDisabled}
          className="text-blue-pretty size-11 text-lg"
        >
          ⭐
        </RoundButton>
        <RoundButton
          label={`Like ${name}`}
          onClick={() => onSwipe('like')}
          disabled={isDisabled}
          className="size-14 text-2xl text-pink-500"
        >
          ♥
        </RoundButton>
      </div>
      <p className="text-sidenav-secondary text-center text-[11px]">
        {wallet.isUnlimited ? (
          <span className="font-bold text-pink-600">
            ♾️ Unlimited rizz activated
          </span>
        ) : (
          <>
            <span className={swipes <= 0 ? 'swipe-count--empty' : undefined}>
              👆 {swipes} swipes
            </span>
            {' · '}
            <span
              className={superLikes <= 0 ? 'swipe-count--empty' : undefined}
            >
              💘 {superLikes} super likes
            </span>{' '}
            left
          </>
        )}
      </p>
    </div>
  )
}

type LikesProps = {
  likes: Match[]
  verdicts: Record<string, Verdict>
  openId?: string
  onOpen: (id: string) => void
}

function Likes({ likes, verdicts, openId, onOpen }: LikesProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-main-text text-[10px] font-bold tracking-widest uppercase">
        Your likes
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {likes.map(match => (
          <li
            key={match.id}
            className="swipe-like-pop"
          >
            <button
              type="button"
              aria-label={`Show options with ${match.firstName}`}
              aria-pressed={openId === match.id}
              title={match.firstName}
              onClick={() => onOpen(match.id)}
              className={`relative block rounded-full transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:outline-none ${openId === match.id ? 'ring-2 ring-pink-500 ring-offset-1' : ''}`}
            >
              <Avatar
                name={match.firstName}
                size="sm"
                photoUrl={match.photoUrl}
              />
              <span
                aria-hidden
                className="absolute -right-1 -bottom-0.5 text-[10px] leading-none"
              >
                {verdicts[match.id] === 'super' ? '⭐' : '💗'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Celebration({ match, isSuper }: { match: Match; isSuper: boolean }) {
  const burst = isSuper ? STAR_BURST : HEART_BURST

  return (
    <div
      aria-hidden
      className={`swipe-celebrate z-10 col-start-1 row-start-1 flex min-h-56 flex-col items-center justify-center gap-3 self-start rounded-2xl p-4 text-white ${isSuper ? 'swipe-celebrate--super' : ''}`}
    >
      <p className="font-title swipe-celebrate__title text-4xl tracking-wide drop-shadow">
        {isSuper ? 'Super match!' : 'It’s a match!'}
      </p>
      <div className="flex items-center">
        <span className="swipe-celebrate__you flex flex-col items-center gap-1">
          <Avatar
            name="You"
            size="lg"
          />
          <span className="text-xs font-bold">You</span>
        </span>
        <span className="relative z-10 -mx-3 -mt-5 grid size-11 place-items-center">
          <span className="swipe-celebrate__heart grid size-11 place-items-center rounded-full bg-white text-xl shadow-lg">
            {isSuper ? '⭐' : '❤️'}
          </span>
          {burst.map(({ icon, dx, dy, rot }, i) => (
            <span
              key={i}
              className="motion-safe:animate-burst absolute top-1/2 left-1/2 -mt-2.5 -ml-2 text-base opacity-0"
              style={vars({
                '--dx': `${dx}px`,
                '--dy': `${dy}px`,
                '--rot': `${rot}deg`,
                animationDelay: `${450 + (i % 3) * 60}ms`,
              })}
            >
              {icon}
            </span>
          ))}
        </span>
        <span className="swipe-celebrate__them flex flex-col items-center gap-1">
          <Avatar
            name={match.firstName}
            size="lg"
            photoUrl={match.photoUrl}
          />
          <span className="text-xs font-bold">{match.firstName}</span>
        </span>
      </div>
      <p className="text-xs opacity-90">
        {isSuper
          ? `${match.firstName} got a notification with sparkles on it. Probably.`
          : `You and ${match.firstName} could really click.`}
      </p>
    </div>
  )
}

type MatchedPanelProps = {
  match: Match
  isSuper: boolean
  onBack: () => void
}

function MatchedPanel({ match, isSuper, onBack }: MatchedPanelProps) {
  const name = match.firstName

  return (
    <div className="swipe-matched space-y-1 rounded-2xl bg-white/85 p-3.5 shadow-lg ring-1 ring-pink-500/20 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex -space-x-3"
        >
          <Avatar name="You" />
          <Avatar
            name={name}
            photoUrl={match.photoUrl}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-title text-sidenav-blue text-2xl leading-none">
            Matched with {name} {isSuper ? '⭐' : '💞'}
          </p>
          <p className="truncate text-xs">
            {match.score}% match · <span className="italic">{match.vibe}</span>
          </p>
        </div>
      </div>
      {match.matchMessages?.length ? (
        <MatchChat match={match} />
      ) : (
        match.icebreaker && (
          <p className="pt-1 text-xs text-[#7a1f45]">
            💬 Open with: “{match.icebreaker}”
          </p>
        )
      )}
      <NextSteps
        title={`With ${name}`}
        steps={matchSteps(name)}
      />
      <div className="pt-1.5">
        <button
          type="button"
          onClick={onBack}
          className={LOCAL_PILL}
        >
          👉 Keep swiping
        </button>
      </div>
    </div>
  )
}

/** Their first messages after the match: typing dots, then each bubble pops in. */
function MatchChat({ match }: { match: Match }) {
  const messages = match.matchMessages ?? []

  return (
    <ol
      aria-label={`Messages from ${match.firstName}`}
      aria-live="polite"
      className="space-y-1.5 pt-2"
    >
      {messages.map((message, index) => (
        <li
          key={index}
          className="match-chat__row"
          style={vars({ '--d': `${0.5 + index * 1.9}s` })}
        >
          <span
            aria-hidden
            className="match-chat__typing"
          >
            <span />
            <span />
            <span />
          </span>
          <span className="match-chat__msg">
            <Avatar
              name={match.firstName}
              size="sm"
              photoUrl={match.photoUrl}
            />
            <span className="match-chat__bubble">{message}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function EndOfDeck({ likes, onReset }: { likes: number; onReset: () => void }) {
  return (
    <div className="swipe-matched col-start-1 row-start-1 space-y-1 rounded-2xl bg-white/85 p-4 shadow-lg ring-1 ring-pink-500/20 backdrop-blur-md">
      <p className="font-title text-sidenav-blue text-2xl leading-none">
        That’s everyone on the radar 📡
      </p>
      <p className="text-xs">
        {likes > 0
          ? `${likes} ${likes === 1 ? 'like' : 'likes'} in the bag. Tap one above to make plans.`
          : 'Picky! We respect it.'}
      </p>
      <div className="pt-1.5">
        <button
          type="button"
          onClick={onReset}
          className={LOCAL_PILL}
        >
          🔁 Start over
        </button>
      </div>
      <NextSteps
        title="Or ask for"
        steps={END_STEPS}
      />
    </div>
  )
}

/** Shown while the radar scans: three grey cards with a shimmer. */
export function SwipeDeckSkeleton() {
  return (
    <div
      aria-hidden
      className="swipe-stack"
    >
      {[0, 1, 2].map(depth => (
        <div
          key={depth}
          className="swipe-card swipe-skeleton"
          style={vars({ '--depth': depth, zIndex: 3 - depth })}
        >
          <div className="space-y-3 p-3.5">
            <div className="flex items-center gap-3">
              <div className="swipe-bone size-16 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="swipe-bone h-5 w-1/2 rounded-full" />
                <div className="swipe-bone h-3 w-3/4 rounded-full" />
                <div className="swipe-bone h-3 w-1/3 rounded-full" />
              </div>
              <div className="swipe-bone size-14 rounded-full" />
            </div>
            <div className="flex gap-1.5">
              <div className="swipe-bone h-5 w-24 rounded-full" />
              <div className="swipe-bone h-5 w-20 rounded-full" />
              <div className="swipe-bone h-5 w-16 rounded-full" />
            </div>
            <div className="swipe-bone ml-auto h-10 w-3/4 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  )
}
