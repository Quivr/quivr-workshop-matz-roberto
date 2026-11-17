import type { CSSProperties } from 'react'

import { CharacterAvatar } from '../../characters/CharacterAvatar'
import { charactersByRole, getCharacter } from '../../characters/registry'
import type { CharacterClip } from '../../characters/types'
import { SpeechBalloon } from '../../components/SpeechBalloon'
import type { BreakSnapshot } from './breakController'
import { BREAK_BANTER, type GagLine, type PipState } from './script'

/*
 * The scene is 200px tall, back to front:
 *   wall + shelf  ->  Gus (behind the bar)  ->  bar top and front panel
 *   ->  taps  ->  customers on stools (in front of the bar)  ->  balloons
 * Only the bartender is behind the counter. Everyone else is a customer.
 */
const BAR_TOP = 100
const CUSTOMER_TOP = 104

const BOTTLES = [
  'bg-vegan h-5',
  'bg-main h-6',
  'bg-danger h-5',
  'bg-blue-pretty h-6',
  'bg-main h-5',
  'bg-vegan h-6',
  'bg-danger h-5',
]

function Shelf() {
  return (
    <div
      aria-hidden
      className="absolute inset-x-[16%] top-[18px] flex flex-col"
    >
      <div className="flex items-end justify-around px-2">
        {BOTTLES.map((bottle, index) => (
          <div
            key={index}
            className="flex flex-col items-center"
          >
            <span className="bg-sidenav-secondary h-1.5 w-1 rounded-t-sm" />
            <span className={`w-3 rounded-sm opacity-90 ${bottle}`} />
          </div>
        ))}
        {[0, 1].map(glass => (
          <span
            key={glass}
            className="border-surface/60 h-3.5 w-3 rounded-b-md border-2 border-t-0"
          />
        ))}
      </div>
      <div className="bg-wood h-1.5 rounded-sm" />
    </div>
  )
}

function Taps() {
  return (
    <>
      {['left-[26%]', 'left-[31%]', 'left-[36%]'].map((left, index) => (
        <div
          key={left}
          aria-hidden
          className={`absolute z-20 flex flex-col items-center ${left}`}
          style={{ top: BAR_TOP - 22 }}
        >
          <span
            className={`h-3.5 w-2 rounded-t-md ${
              ['bg-main', 'bg-vegan', 'bg-danger'][index]
            }`}
          />
          <span className="bg-sidenav-secondary h-2.5 w-1" />
          <span className="bg-sidenav-secondary h-1 w-3 rounded-sm" />
        </div>
      ))}
    </>
  )
}

type CustomerProps = {
  id: string
  left: string
  clip: CharacterClip
  presence?: PipState
  /** Pip leans over the bar towards Gus. */
  isLeaning?: boolean
}

const SEAT_TOP = CUSTOMER_TOP + 48

/**
 * A customer on a stool in front of the bar. The stool stays put; the person
 * can slide off to the right and come back (Pip). Away means invisible and
 * out of the accessibility tree, and with motion off there is no slide.
 */
function Customer({
  id,
  left,
  clip,
  presence = 'here',
  isLeaning = false,
}: CustomerProps) {
  const isAway = presence === 'leaving' || presence === 'away'
  return (
    <>
      <div
        className="absolute z-[25] flex -translate-x-1/2 flex-col items-center"
        style={{ left, top: SEAT_TOP }}
      >
        <span
          aria-hidden
          className="bg-sidenav-secondary border-sidenav-blue/40 h-2 w-11 rounded-full border"
        />
        <span
          aria-hidden
          className="bg-sidenav-secondary h-4 w-1"
        />
        <span
          aria-hidden
          className="bg-sidenav-secondary h-1 w-7 rounded-full"
        />
        <span
          className={`bg-surface text-heading font-title mt-0.5 rounded px-1.5 text-sm leading-4 tracking-wide ${
            isAway ? 'opacity-60' : ''
          }`}
        >
          {getCharacter(id)?.name}
        </span>
      </div>
      <div
        className={`absolute z-30 -translate-x-1/2 motion-safe:transition-[left,opacity,visibility] motion-safe:duration-[1400ms] motion-safe:ease-in-out ${
          isAway ? 'invisible opacity-0' : 'visible opacity-100'
        }`}
        style={{ left: isAway ? '108%' : left, top: CUSTOMER_TOP }}
      >
        <div
          className={`relative origin-bottom motion-safe:transition-transform motion-safe:duration-500 ${
            isLeaning ? '-translate-y-5 -rotate-12' : ''
          }`}
        >
          <CharacterAvatar
            characterId={id}
            clip={clip}
            size={52}
          />
          {isLeaning && (
            <>
              <span
                aria-hidden
                className="bg-blue-pretty absolute top-7 -left-6 h-1.5 w-7 -rotate-6 rounded-full"
              />
              <span
                aria-hidden
                className="border-surface/70 absolute top-3.5 -left-8 h-3.5 w-3 rounded-b-md border-2 border-t-0"
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}

type SayProps = {
  name: string | undefined
  line: string | undefined
  /** Positioning of the balloon box. */
  className?: string
  style?: CSSProperties
  /** Which side of the avatar the balloon sits on. */
  balloonOn: 'left' | 'right'
}

/** A balloon beside a character. The live region is always there so changes are announced. */
function Say({ name, line, className = '', style, balloonOn }: SayProps) {
  return (
    <div
      aria-live="polite"
      className={`absolute z-40 w-max max-w-[8rem] sm:max-w-[12rem] ${className}`}
      style={style}
    >
      {line && (
        <SpeechBalloon
          key={line}
          side={balloonOn === 'right' ? 'left' : 'right'}
          className="w-fit max-w-xs text-sm"
        >
          <span className="sr-only">{name} says: </span>
          {line}
        </SpeechBalloon>
      )}
    </div>
  )
}

type Props = {
  breakState: BreakSnapshot
  gagLine: GagLine | null
  /** Ambient chat about the student's schedule. Never plays over the gag. */
  banterLine: GagLine | null
  pip: PipState
}

/** A bar: Gus behind the counter, Bram, Stien and Pip in front of it. Their words come in balloons. */
export function BarScene({ breakState, gagLine, banterLine, pip }: Props) {
  const line = gagLine ?? banterLine
  const [bartender] = charactersByRole('bartender')
  const beerLovers = charactersByRole('beer-lover')
  const [sodaLover] = charactersByRole('soda-lover')
  const isOnBreak = breakState.phase === 'break'
  const showBanter = isOnBreak && breakState.elapsedMs < BREAK_BANTER.ms

  const lineOf = (id: string | undefined): string | undefined =>
    line && line.speaker === id
      ? line.text
      : showBanter && id === BREAK_BANTER.speaker
        ? BREAK_BANTER.text
        : undefined
  const clipOf = (id: string): CharacterClip =>
    line?.speaker === id ? 'talking' : 'idle'
  const isRefusing = gagLine?.speaker === bartender?.id
  const beerLoverLefts = ['10%', '26%']
  const gusLeft = '46%'

  return (
    <section
      aria-label="The bar"
      className="relative isolate mx-auto hidden h-[200px] w-full max-w-3xl overflow-x-clip [@media(min-height:560px)]:block"
    >
      <div className="absolute inset-0 overflow-hidden rounded-lg shadow-sm">
        <div className="bg-sidenav-blue absolute inset-0" />
        <Shelf />
        {bartender && (
          <div
            className="absolute top-[44px] z-10 -translate-x-1/2"
            style={{ left: gusLeft }}
          >
            <CharacterAvatar
              characterId={bartender.id}
              clip={isOnBreak ? 'break' : clipOf(bartender.id)}
              size={64}
            />
          </div>
        )}
        {isRefusing && (
          <span
            aria-hidden
            className="bg-sidenav-secondary border-surface/70 absolute top-[62px] left-[calc(50%+2.25rem)] z-10 size-4 rounded-full border-2 motion-safe:animate-bounce"
          />
        )}
        <div
          aria-hidden
          className="bg-cardbg absolute inset-x-0 bottom-0 h-7"
        />
        <div
          aria-hidden
          className="bg-wood absolute inset-x-0 z-20"
          style={{ top: BAR_TOP, height: 72 }}
        >
          <div className="bg-main/40 h-1.5" />
          <div className="bg-sidenav-blue/20 absolute inset-x-0 top-3 bottom-0" />
          <div className="bg-sidenav-blue/25 absolute inset-x-0 bottom-0 h-1.5" />
          <div className="bg-main/70 absolute inset-x-0 bottom-3 h-1" />
        </div>
        <Taps />
        <span
          className="bg-main text-sidenav-blue font-title absolute top-[124px] z-20 -translate-x-1/2 rounded-sm px-2 text-sm leading-4 tracking-wide whitespace-nowrap"
          style={{ left: gusLeft }}
        >
          {bartender?.name}
          {isOnBreak ? ' · on a break' : ''}
        </span>
      </div>
      {beerLovers.map((character, index) => (
        <Customer
          key={character.id}
          id={character.id}
          left={beerLoverLefts[index] ?? '10%'}
          clip={clipOf(character.id)}
        />
      ))}
      {sodaLover && (
        <Customer
          id={sodaLover.id}
          left="78%"
          clip={pip === 'here' ? clipOf(sodaLover.id) : 'idle'}
          presence={pip}
          isLeaning={pip === 'here' && gagLine !== null}
        />
      )}
      {bartender && (
        <Say
          name={bartender.name}
          line={lineOf(bartender.id)}
          balloonOn="right"
          className="top-[26px]"
          style={{ left: `calc(${gusLeft} + 2.5rem)` }}
        />
      )}
      {sodaLover && (
        <Say
          name={sodaLover.name}
          line={lineOf(sodaLover.id)}
          balloonOn="left"
          className="top-[78px] right-[calc(22%+2.25rem)]"
        />
      )}
      {beerLovers.map((character, index) => (
        <Say
          key={character.id}
          name={character.name}
          line={lineOf(character.id)}
          balloonOn="right"
          className="top-[104px]"
          style={{ left: `calc(${beerLoverLefts[index] ?? '10%'} + 2.25rem)` }}
        />
      ))}
    </section>
  )
}
