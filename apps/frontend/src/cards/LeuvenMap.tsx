import { memo } from 'react'
import type { ReactNode } from 'react'

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

type Point = { x: number; y: number }
type Pt = [number, number]

export const MAP_WIDTH = 640
export const MAP_HEIGHT = 420

/** Where each area sits on the stylised map, in SVG units. North is up. */
export const AREA_POINTS: Record<MapArea, Point> = {
  centrum: { x: 298, y: 192 },
  naamsestraat: { x: 290, y: 268 },
  tiensestraat: { x: 368, y: 225 },
  'groep-t': { x: 392, y: 288 },
  vaartkom: { x: 419, y: 62 },
  station: { x: 448, y: 206 },
  arenberg: { x: 215, y: 368 },
  heverlee: { x: 335, y: 362 },
  gasthuisberg: { x: 118, y: 292 },
}

export const AREA_NAMES: Record<MapArea, string> = {
  centrum: 'Centrum',
  naamsestraat: 'Naamsestraat',
  tiensestraat: 'Tiensestraat',
  'groep-t': 'Groep T',
  vaartkom: 'Vaartkom',
  station: 'Station',
  arenberg: 'Arenberg',
  heverlee: 'Heverlee',
  gasthuisberg: 'Gasthuisberg',
}

/** Unknown areas fall back to the centre instead of crashing the card. */
export const pointOf = (area: string): Point =>
  AREA_POINTS[area as MapArea] ?? AREA_POINTS.centrum

/** "You" sit a little beside the area point so a pin there doesn't cover you. */
export const youPoint = (area: string): Point => {
  const point = pointOf(area)
  return { x: point.x - 28, y: point.y - 6 }
}

const round = (n: number) => Math.round(n * 10) / 10

/** Catmull-Rom spline through the points, as an SVG path. */
function smooth(points: Pt[], closed = false): string {
  const at = (i: number) => points[(i + points.length) % points.length] as Pt
  // Open paths repeat the end points instead of wrapping around.
  const get = (i: number) =>
    closed ? at(i) : (points[Math.min(points.length - 1, Math.max(0, i))] as Pt)
  const last = closed ? points.length : points.length - 1
  let d = `M${get(0)[0]} ${get(0)[1]}`
  for (let i = 0; i < last; i++) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = [
      get(i - 1),
      get(i),
      get(i + 1),
      get(i + 2),
    ]
    const c1 = `${round(x1 + (x2 - x0) / 6)} ${round(y1 + (y2 - y0) / 6)}`
    const c2 = `${round(x2 - (x3 - x1) / 6)} ${round(y2 - (y3 - y1) / 6)}`
    d += ` C${c1} ${c2} ${x2} ${y2}`
  }
  return closed ? `${d}Z` : d
}

const RING = smooth(
  [
    [300, 96],
    [392, 112],
    [458, 170],
    [466, 235],
    [425, 298],
    [340, 334],
    [250, 332],
    [180, 296],
    [142, 225],
    [165, 150],
    [225, 108],
  ],
  true
)

const DIJLE = smooth([
  [262, 425],
  [270, 392],
  [310, 362],
  [330, 330],
  [322, 290],
  [338, 255],
  [345, 222],
  [335, 190],
  [352, 160],
  [350, 125],
  [368, 90],
  [360, 50],
  [372, -5],
])

const CANAL = smooth([
  [419, 52],
  [421, 20],
  [418, -6],
])

const RAILS = [
  smooth([
    [640, 125],
    [540, 165],
    [470, 198],
    [448, 208],
  ]),
  smooth([
    [448, 208],
    [432, 262],
    [440, 330],
    [470, 426],
  ]),
  smooth([
    [448, 208],
    [452, 150],
    [480, 100],
    [500, 40],
    [505, -6],
  ]),
].join(' ')

const STREETS = [
  [
    [298, 192],
    [293, 230],
    [291, 268],
    [296, 305],
    [304, 336],
  ],
  [
    [298, 192],
    [335, 208],
    [368, 225],
    [402, 246],
    [425, 262],
  ],
  [
    [298, 192],
    [350, 194],
    [400, 200],
    [448, 206],
  ],
  [
    [298, 192],
    [318, 152],
    [325, 120],
    [332, 96],
  ],
  [
    [298, 192],
    [268, 168],
    [240, 140],
    [225, 108],
  ],
  [
    [298, 192],
    [272, 208],
    [252, 222],
    [215, 245],
    [175, 290],
    [118, 292],
  ],
  [
    [368, 225],
    [380, 260],
    [392, 288],
  ],
  [
    [304, 336],
    [280, 350],
    [245, 362],
    [215, 368],
  ],
  [
    [304, 336],
    [320, 350],
    [335, 362],
  ],
]
  .map(points => smooth(points as Pt[]))
  .join(' ')

/** cx, cy, rx, ry, rotation */
const PARKS = [
  [215, 190, 22, 14, -20],
  [275, 375, 32, 16, 10],
  [392, 362, 34, 17, -8],
  [545, 62, 38, 22, 0],
  [96, 196, 38, 22, 20],
  [560, 292, 50, 26, -10],
  [85, 355, 40, 24, 15],
]

/** Campus buildings: x, y, w, h */
const CAMPUS = [
  [186, 340, 26, 16],
  [222, 338, 24, 14],
  [196, 380, 30, 14],
  [96, 270, 22, 14],
  [96, 304, 26, 14],
  [132, 308, 20, 12],
]

const rand = (seed: number) => {
  const v = Math.sin(seed * 12.9898) * 43758.5453
  return v - Math.floor(v)
}

/** Deterministic jittered city blocks inside the ring. */
const BLOCKS = Array.from({ length: 10 * 12 }, (_, i) => {
  const [gx, gy, seed] = [i % 12, Math.floor(i / 12), i + 1]
  const x = 132 + gx * 28 + rand(seed) * 8
  const y = 96 + gy * 26 + rand(seed + 500) * 8
  const [dx, dy] = [(x - 300) / 150, (y - 212) / 112]
  const isInside = dx * dx + dy * dy < 0.8
  const isPlaza = Math.hypot(x - 298, y - 192) < 22
  if (!isInside || isPlaza || rand(seed + 700) > 0.88) return null
  const [w, h] = [14 + rand(seed + 100) * 9, 11 + rand(seed + 200) * 8]
  const rotate = (rand(seed + 300) - 0.5) * 14
  return {
    x,
    y,
    w,
    h,
    transform: `rotate(${round(rotate)} ${round(x + w / 2)} ${round(y + h / 2)})`,
  }
}).filter(block => block !== null)

const GRID = [
  ...Array.from(
    { length: 19 },
    (_, i) => `M${40 * i - 40} -40V${MAP_HEIGHT + 40}`
  ),
  ...Array.from(
    { length: 13 },
    (_, i) => `M-40 ${40 * i - 40}H${MAP_WIDTH + 40}`
  ),
].join('')

type Landmark = {
  name: string
  at: Point
  side: 'start' | 'end'
  icon?: string
}

const LANDMARKS: Landmark[] = [
  { name: 'Grote Markt', at: AREA_POINTS.centrum, side: 'end', icon: '🏰' },
  {
    name: 'Ladeuzeplein / UB',
    at: { x: 252, y: 222 },
    side: 'end',
    icon: '📖',
  },
  { name: 'Naamsestraat', at: AREA_POINTS.naamsestraat, side: 'start' },
  { name: 'Tiensestraat', at: AREA_POINTS.tiensestraat, side: 'start' },
  { name: 'Groep T', at: AREA_POINTS['groep-t'], side: 'end', icon: '🏫' },
  { name: 'Vaartkom', at: AREA_POINTS.vaartkom, side: 'start', icon: '⚓' },
  { name: 'Station', at: AREA_POINTS.station, side: 'start', icon: '🚉' },
  { name: 'Arenberg', at: AREA_POINTS.arenberg, side: 'start', icon: '🎓' },
  { name: 'Heverlee', at: AREA_POINTS.heverlee, side: 'start' },
  {
    name: 'Gasthuisberg',
    at: AREA_POINTS.gasthuisberg,
    side: 'start',
    icon: '🏥',
  },
]

const MapBase = memo(function MapBase({ isCompact }: { isCompact: boolean }) {
  return (
    <>
      <rect
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="fill-map-land"
      />
      <g className="fill-map-block">
        {BLOCKS.map(block => (
          <rect
            key={`${block.x}-${block.y}`}
            x={round(block.x)}
            y={round(block.y)}
            width={round(block.w)}
            height={round(block.h)}
            rx={3}
            transform={block.transform}
          />
        ))}
        {CAMPUS.map(([x, y, w, h]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={3}
          />
        ))}
      </g>
      <g className="fill-map-park">
        {PARKS.map(([cx, cy, rx, ry, rotate]) => (
          <ellipse
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            transform={`rotate(${rotate} ${cx} ${cy})`}
          />
        ))}
      </g>
      <g className="stroke-map-water fill-none">
        <path
          d={CANAL}
          strokeWidth={7}
        />
        <path
          d={`M362 62H376`}
          strokeWidth={6}
        />
        <path
          d={DIJLE}
          strokeWidth={6.5}
          strokeLinecap="round"
        />
      </g>
      <rect
        x={372}
        y={51}
        width={98}
        height={22}
        rx={5}
        className="fill-map-water"
      />
      <path
        d={RAILS}
        strokeWidth={3.5}
        className="stroke-schedule-border-grey fill-none"
      />
      <path
        d={RAILS}
        strokeWidth={1.6}
        strokeDasharray="5 5"
        className="fill-none stroke-white"
      />
      <path
        d={STREETS}
        strokeWidth={3.2}
        strokeLinecap="round"
        className="fill-none stroke-white"
      />
      <path
        d={RING}
        strokeWidth={9}
        className="fill-none stroke-white"
      />
      <path
        d={RING}
        strokeWidth={5}
        className="stroke-main fill-none"
      />
      <rect
        x={130}
        y={218}
        width={24}
        height={14}
        rx={3}
        className="stroke-sidenav-secondary fill-white"
      />
      {!isCompact && (
        <text
          x={142}
          y={225}
          dy="0.35em"
          textAnchor="middle"
          fontSize={8}
          fontWeight="bold"
          className="fill-sidenav-secondary"
        >
          R23
        </text>
      )}
      {!isCompact && (
        <text
          transform="translate(363 150) rotate(-80)"
          fontSize={8}
          fontStyle="italic"
          className="fill-blue-pretty"
        >
          Dijle
        </text>
      )}
      {LANDMARKS.map(({ name, at, side, icon }) => (
        <g key={name}>
          {icon ? (
            <text
              x={at.x}
              y={at.y}
              dy="0.35em"
              textAnchor="middle"
              fontSize={11}
            >
              {icon}
            </text>
          ) : (
            <circle
              cx={at.x}
              cy={at.y}
              r={2.5}
              className="fill-sidenav-secondary"
            />
          )}
          {!isCompact && (
            <text
              x={at.x + (side === 'start' ? 12 : -12)}
              y={at.y}
              dy="0.35em"
              textAnchor={side}
              fontSize={9.5}
              fontWeight="bold"
              strokeWidth={3}
              strokeLinejoin="round"
              className="fill-sidenav-secondary stroke-map-land [paint-order:stroke]"
            >
              {name}
            </text>
          )}
        </g>
      ))}
      {!isCompact && (
        <>
          <text
            x={16}
            y={38}
            fontSize={34}
            className="font-title fill-sidenav-blue/20 tracking-widest"
          >
            LEUVEN
          </text>
          <g transform="translate(606 36)">
            <circle
              r={15}
              className="fill-white/80"
            />
            <path
              d="M0 -10L4.5 4L0 1L-4.5 4Z"
              className="fill-sidenav-blue"
            />
            <text
              y={22}
              textAnchor="middle"
              fontSize={8}
              fontWeight="bold"
              className="fill-sidenav-secondary"
            >
              N
            </text>
          </g>
        </>
      )}
    </>
  )
})

type LeuvenMapProps = {
  children?: ReactNode
  /** Mini-map: no street names, watermark or compass. */
  isCompact?: boolean
  className?: string
}

/** The stylised map frame. Children (radar, pins) draw on top. */
export function LeuvenMap({
  children,
  isCompact = false,
  className = '',
}: LeuvenMapProps) {
  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="group"
      aria-label="Stylised map of Leuven"
      className={`block h-auto w-full select-none ${className}`}
    >
      <MapBase isCompact={isCompact} />
      {children}
    </svg>
  )
}

type PinShapeProps = {
  /** Tailwind fill class for the teardrop. */
  fill: string
  icon: string
  isSelected?: boolean
}

/** Teardrop pin with its tip at (0, 0) and the icon in the head. */
export function PinShape({ fill, icon, isSelected = false }: PinShapeProps) {
  return (
    <>
      <path
        d="M0 0C-5 -8 -13 -14 -13 -24A13 13 0 1 1 13 -24C13 -14 5 -8 0 0Z"
        strokeWidth={2}
        className={`${fill} ${isSelected ? 'stroke-sidenav-blue' : 'stroke-white'}`}
      />
      <circle
        cy={-24}
        r={9}
        className="fill-white"
      />
      <text
        y={-24}
        dy="0.35em"
        textAnchor="middle"
        fontSize={11}
      >
        {icon}
      </text>
    </>
  )
}

/** Blinking "you are here" dot with a label pill. Drawn above the pins; ignores the pointer. */
export function YouMarker({ area, label }: { area: string; label?: string }) {
  const { x, y } = youPoint(area)
  const text = label ? `You · ${label}` : 'You'
  const width = text.length * 5.2 + 14
  // The pill ends just right of the dot and never leaves the map.
  const left = Math.max(4 - x, 10 - width)

  return (
    <g
      transform={`translate(${x} ${y})`}
      pointerEvents="none"
      className="motion-safe:animate-fade-in"
    >
      <circle
        r={5}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        className="stroke-blue-pretty motion-safe:animate-radar-ring fill-none motion-reduce:hidden"
      />
      <circle
        r={5.5}
        strokeWidth={2}
        className="fill-blue-pretty motion-safe:animate-blink stroke-white"
      />
      <g transform={`translate(${left} -28)`}>
        <rect
          width={width}
          height={15}
          rx={7.5}
          strokeWidth={1}
          className="stroke-blue-pretty fill-white/90"
        />
        <text
          x={width / 2}
          y={7.5}
          dy="0.35em"
          textAnchor="middle"
          fontSize={9}
          fontWeight="bold"
          className="fill-blue-pretty"
        >
          {text}
        </text>
      </g>
    </g>
  )
}

const SWEEP_RADIUS = 280
const SWEEP_STEP = 3.5

const polar = (angle: number) => {
  const rad = (angle * Math.PI) / 180
  return `${round(SWEEP_RADIUS * Math.cos(rad))} ${round(SWEEP_RADIUS * Math.sin(rad))}`
}

/** Stacked wedges trailing behind the leading edge fake a conic gradient. */
const SWEEP_WEDGES = Array.from(
  { length: 24 },
  (_, i) =>
    `M0 0L${SWEEP_RADIUS} 0A${SWEEP_RADIUS} ${SWEEP_RADIUS} 0 0 0 ${polar(-(i + 1) * SWEEP_STEP)}Z`
)

type ScanLayerProps = {
  x: number
  y: number
  /** Slow, quiet sweep (nobody found). */
  isSlow: boolean
  /** Fade the whole layer out. */
  isFading: boolean
}

/** Dim grid plus radar sweep and pulse rings. Glides to (x, y) when it changes. */
export function ScanLayer({ x, y, isSlow, isFading }: ScanLayerProps) {
  return (
    <g
      pointerEvents="none"
      className={
        isFading
          ? 'animate-fade-out motion-reduce:hidden'
          : 'motion-safe:animate-fade-in'
      }
    >
      <rect
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="fill-sidenav-blue/15"
      />
      <g className="motion-safe:animate-drift">
        <path
          d={GRID}
          strokeWidth={0.6}
          className="stroke-green-status/30 fill-none"
        />
      </g>
      <g
        className="transition-transform duration-1000 ease-in-out"
        style={{ transform: `translate(${x}px, ${y}px)` }}
      >
        {[60, 120, 180].map(radius => (
          <circle
            key={radius}
            r={radius}
            strokeWidth={1}
            strokeDasharray="3 5"
            className="stroke-green-status/40 fill-none"
          />
        ))}
        {!isSlow &&
          [0, 1, 2].map(i => (
            <circle
              key={i}
              r={60}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              className="stroke-green-status motion-safe:animate-radar-ring fill-none motion-reduce:hidden"
              style={{ animationDelay: `${-i * 0.8}s` }}
            />
          ))}
        <g
          className={`motion-reduce:hidden ${isSlow ? 'motion-safe:animate-radar-slow' : 'motion-safe:animate-radar'}`}
        >
          {SWEEP_WEDGES.map(d => (
            <path
              key={d}
              d={d}
              className="fill-green-status/[0.022]"
            />
          ))}
          <line
            x2={SWEEP_RADIUS}
            strokeWidth={2}
            strokeLinecap="round"
            className="stroke-green-status [filter:drop-shadow(0_0_4px_#1abc9c)]"
          />
        </g>
      </g>
    </g>
  )
}
