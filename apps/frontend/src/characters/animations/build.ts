import type { CharacterClip, CharacterRole } from '../types'
import {
  composition,
  ellipse,
  layer,
  loop,
  mouthShape,
  nullLayer,
  poly,
  rect,
  luminance,
  type Json,
  type Paint,
} from './lottie'
import { palette } from './palette'

export type BodyShape =
  | 'circle'
  | 'squircle'
  | 'square'
  | 'diamond'
  | 'triangle'
  | 'hexagon'
  | 'pentagon'
export type Accessory =
  | 'foam'
  | 'bowtie'
  | 'straw'
  | 'antenna'
  | 'ears'
  | 'glasses'
  | 'leaf'
  | 'headband'
  | 'none'

export type Look = {
  body: BodyShape
  color: string
  accessory: Accessory
  accent: string
  /** What `break` holds: a beer, a soda, ... */
  drink?: string
}

const CX = 50
const CY = 58
const DARK = palette.sidenavBlue

const GENERAL_CLIPS: CharacterClip[] = [
  'idle',
  'talking',
  'argue',
  'fight',
  'calm',
]
const DRINKER_CLIPS: CharacterClip[] = [...GENERAL_CLIPS, 'break']

export const clipsForRole = (role: CharacterRole): CharacterClip[] =>
  role === 'general' ? GENERAL_CLIPS : DRINKER_CLIPS

const bodyShape = (look: Look, ink: string): Json => {
  const p: Paint = { fill: look.color, stroke: ink, width: 2.5 }
  switch (look.body) {
    case 'circle':
      return ellipse(CX, CY, 58, 58, p)
    case 'squircle':
      return rect(CX, CY, 56, 56, 22, p)
    case 'square':
      return rect(CX, CY, 56, 56, 6, p)
    case 'diamond':
      return rect(CX, CY, 46, 46, 6, p, 45)
    case 'triangle':
      return poly(CX, CY + 2, 3, 36, p)
    case 'hexagon':
      return poly(CX, CY, 6, 33, p)
    case 'pentagon':
      return poly(CX, CY + 1, 5, 33, p)
  }
}

const accessoryShapes = (look: Look, ink: string): Json[] => {
  const a = look.accent
  switch (look.accessory) {
    case 'foam': {
      const foam: Paint = { fill: palette.white, stroke: '#dddddd', width: 1.5 }
      return [
        ellipse(39, 31, 15, 15, foam),
        ellipse(61, 31, 15, 15, foam),
        ellipse(50, 26, 18, 18, foam),
      ]
    }
    case 'bowtie':
      return [
        poly(40, 86, 3, 8, { fill: a }, 90),
        poly(60, 86, 3, 8, { fill: a }, -90),
        ellipse(50, 86, 6, 6, { fill: a }),
      ]
    case 'straw':
      return [
        rect(68, 24, 5, 30, 2, { fill: a, stroke: DARK, width: 1.5 }, 18),
        rect(73, 10, 9, 5, 2, { fill: a, stroke: DARK, width: 1.5 }),
      ]
    case 'antenna':
      return [
        rect(CX, 24, 2.5, 14, 1, { fill: DARK }),
        ellipse(CX, 17, 9, 9, { fill: a, stroke: DARK, width: 1.5 }),
      ]
    case 'ears':
      return [
        ellipse(29, 33, 18, 18, { fill: look.color, stroke: ink, width: 2.5 }),
        ellipse(71, 33, 18, 18, { fill: look.color, stroke: ink, width: 2.5 }),
        ellipse(29, 33, 8, 8, { fill: a }),
        ellipse(71, 33, 8, 8, { fill: a }),
      ]
    case 'glasses':
      return [
        ellipse(40, 52, 15, 15, { stroke: ink, width: 2 }),
        ellipse(60, 52, 15, 15, { stroke: ink, width: 2 }),
        rect(CX, 52, 5, 2, 1, { fill: ink }),
      ]
    case 'leaf':
      return [ellipse(CX + 2, 25, 9, 20, { fill: a, stroke: DARK, width: 1.5 })]
    case 'headband':
      return [rect(CX, 39, 52, 7, 3, { fill: a, stroke: ink, width: 1.5 })]
    case 'none':
      return []
  }
}

// Motion per clip. Whole-body motion goes on the root; face parts get their own.
type Motion = {
  position?: Json
  rotation?: Json
  scale?: Json
  mouth: number[] // vertical scale keyframes (percent)
  eyes: number[] // vertical scale keyframes (percent)
  brows?: number // angle in degrees, 0 = none
  spark?: boolean
}

const bob = (dy: number, n = 2) =>
  loop(
    Array.from({ length: n * 2 + 1 }, (_, i) => [CX, CY + (i % 2 ? -dy : 0), 0])
  )

const motions: Record<CharacterClip, Motion> = {
  idle: {
    position: bob(2),
    mouth: [45, 45],
    eyes: [100, 100, 100, 100, 100, 10, 100],
  },
  talking: {
    position: bob(1.5, 4),
    mouth: [30, 130, 45, 120, 30, 110, 40, 130, 30],
    eyes: [100, 100],
  },
  argue: {
    rotation: loop([0, -7, 0, 7, 0, -7, 0, 7, 0]),
    position: bob(2, 4),
    mouth: [140, 60, 140, 60, 140],
    eyes: [80, 80],
    brows: 22,
  },
  fight: {
    position: loop([
      [CX - 6, CY, 0],
      [CX + 6, CY - 3, 0],
      [CX - 6, CY, 0],
    ]),
    rotation: loop([-12, 12, -12]),
    scale: loop([
      [100, 100, 100],
      [110, 110, 100],
      [100, 100, 100],
    ]),
    mouth: [160, 90, 160],
    eyes: [60, 60],
    brows: 30,
    spark: true,
  },
  calm: {
    scale: loop([
      [100, 100, 100],
      [103, 103, 100],
      [100, 100, 100],
    ]),
    mouth: [40, 40],
    eyes: [14, 14],
  },
  break: {
    rotation: loop([0, -6, 0, 6, 0]),
    position: bob(3),
    mouth: [35, 35],
    eyes: [14, 14],
  },
}

export function buildClip(name: string, look: Look, clip: CharacterClip): Json {
  const m = motions[clip]
  const ink = luminance(look.color) < 0.55 ? palette.white : DARK
  const layers: Json[] = []
  let ind = 1
  const root = ind++
  const child = (n: string, shapes: Json[], o = {}) =>
    layers.push(layer(ind++, n, shapes, { parent: root, ...o }))

  if (clip === 'break' && look.drink) {
    child(
      'drink',
      [
        rect(80, 72, 15, 20, 3, { fill: look.drink, stroke: DARK, width: 2 }),
        ellipse(80, 62, 14, 7, { fill: palette.white }),
      ],
      {
        pivot: [80, 72],
        position: loop([
          [80, 72, 0],
          [80, 66, 0],
          [80, 72, 0],
        ]),
        rotation: loop([0, -14, 0]),
      }
    )
  }
  if (m.spark) {
    layers.push(
      layer(
        ind++,
        'spark',
        [
          poly(
            82,
            26,
            5,
            11,
            { fill: palette.danger, stroke: DARK, width: 1.5 },
            0,
            true
          ),
        ],
        {
          pivot: [82, 26],
          rotation: loop([0, 30, 0]),
          scale: loop([
            [20, 20, 100],
            [130, 130, 100],
            [20, 20, 100],
          ]),
        }
      )
    )
  }
  if (m.brows) {
    const brow = (x: number, angle: number) =>
      rect(x, 44, 13, 3.5, 1.5, { fill: ink }, angle)
    child('brows', [brow(40, m.brows), brow(60, -m.brows)])
  }
  child('mouth', [mouthShape(CX, 66, 16, 12, { fill: ink })], {
    pivot: [CX, 66],
    scale: loop(m.mouth.map(v => [100, v, 100])),
  })
  child(
    'eyes',
    [
      ellipse(40, 52, 6, 7, { fill: ink }),
      ellipse(60, 52, 6, 7, { fill: ink }),
    ],
    { pivot: [CX, 52], scale: loop(m.eyes.map(v => [100, v, 100])) }
  )
  const accessory = accessoryShapes(look, ink)
  const behind = look.accessory === 'ears'
  if (!behind) child('accessory', accessory)
  child('body', [bodyShape(look, ink)])
  if (behind) child('accessory', accessory)

  layers.unshift(
    nullLayer(root, {
      pivot: [CX, CY],
      position: m.position,
      rotation: m.rotation,
      scale: m.scale,
    })
  )
  return composition(`${name}-${clip}`, layers)
}

export function buildAnimations(
  name: string,
  role: CharacterRole,
  look: Look
): Record<'idle' | 'talking', unknown> &
  Partial<Record<CharacterClip, unknown>> {
  const clips = Object.fromEntries(
    clipsForRole(role).map(c => [c, buildClip(name, look, c)])
  )
  return clips as ReturnType<typeof buildAnimations>
}
