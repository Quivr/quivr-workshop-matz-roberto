import type { CharacterClip, CharacterRole } from '../types'
import {
  composition,
  el,
  g,
  layer,
  loop,
  luminance,
  mouthPath,
  nullLayer,
  pg,
  rc,
  rotatedRect,
  type Json,
  type LayerOpts,
  type Paint,
  type Vec,
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
  | 'moustache'
  | 'cheeks'
  | 'bowtie'
  | 'towel'
  | 'straw'
  | 'bubbles'
  | 'antenna'
  | 'ears'
  | 'bow'
  | 'glasses'
  | 'cap'
  | 'bowler'
  | 'propeller'
  | 'sprout'

export type Look = {
  body: BodyShape
  color: string
  accessories: Accessory[]
  accent: string
  /** What `break` holds: a beer, a soda, ... */
  drink?: string
}

const CX = 50
const CY = 58
// Squash and stretch pivot on the "feet", so characters hop off the ground.
const FOOT = 84
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

const bodyGroup = (look: Look, ink: string): Json => {
  const p: Paint = { fill: look.color, stroke: ink, width: 2.5 }
  switch (look.body) {
    case 'circle':
      return g([el(CX, CY, 58, 58)], p)
    case 'squircle':
      return g([rc(CX, CY, 56, 56, 22)], p)
    case 'square':
      return g([rc(CX, CY, 56, 56, 6)], p)
    case 'diamond':
      return rotatedRect(CX, CY, 46, 46, 6, p, 45)
    case 'triangle':
      return g([pg(CX, CY + 2, 3, 36)], p)
    case 'hexagon':
      return g([pg(CX, CY, 6, 33)], p)
    case 'pentagon':
      return g([pg(CX, CY + 1, 5, 33)], p)
  }
}

type AccLayer = {
  name: string
  shapes: Json[]
  behind?: boolean
} & Pick<LayerOpts, 'pivot' | 'rotation' | 'scale'>

const bow = (x: number, y: number, p: Paint): Json[] => [
  g([pg(x - 8, y, 3, 8, 90), pg(x + 8, y, 3, 8, -90), el(x, y, 6, 6)], p),
]

const wiggle = (deg: number) => loop([-deg, deg, -deg])

const accessoryLayers = (look: Look, ink: string, a: string): AccLayer[] =>
  look.accessories.flatMap((name): AccLayer[] => {
    const outline: Paint = { fill: a, stroke: DARK, width: 1.5 }
    switch (name) {
      case 'foam':
        return [
          {
            name,
            shapes: [
              g([el(39, 31, 15, 15), el(61, 31, 15, 15), el(50, 26, 18, 18)], {
                fill: palette.white,
                stroke: '#dddddd',
                width: 1.5,
              }),
            ],
          },
        ]
      case 'moustache':
        return [
          {
            name,
            shapes: [
              g(
                [
                  el(43, 62, 15, 7),
                  el(57, 62, 15, 7),
                  el(34, 59, 6, 6),
                  el(66, 59, 6, 6),
                ],
                { fill: ink }
              ),
            ],
          },
        ]
      case 'cheeks':
        return [
          {
            name,
            shapes: [
              g([el(31, 60, 10, 7), el(69, 60, 10, 7)], {
                fill: palette.danger,
                opacity: 60,
              }),
            ],
          },
        ]
      case 'bowtie':
        return [{ name, shapes: bow(CX, 86, { fill: a }) }]
      case 'towel':
        return [
          {
            name,
            shapes: [
              rotatedRect(
                24,
                72,
                10,
                24,
                2,
                { fill: palette.white, stroke: DARK, width: 1.5 },
                14
              ),
            ],
          },
        ]
      case 'straw':
        return [
          {
            name,
            shapes: [
              rotatedRect(68, 24, 5, 30, 2, outline, 18),
              g([rc(73, 10, 9, 5, 2)], outline),
            ],
          },
        ]
      case 'bubbles':
        return [
          {
            name,
            shapes: [
              g([el(22, 40, 8, 8), el(15, 30, 5, 5), el(24, 21, 4, 4)], {
                stroke: palette.bluePretty,
                width: 1.5,
              }),
            ],
            rotation: loop([-8, 8, -8]),
            pivot: [26, 52],
          },
        ]
      case 'antenna':
        return [
          {
            name,
            shapes: [
              g([rc(CX, 24, 2.5, 14, 1)], { fill: DARK }),
              g([el(CX, 15, 10, 10)], outline),
            ],
            pivot: [CX, 31],
            rotation: wiggle(18),
          },
        ]
      case 'ears':
        return [
          {
            name,
            behind: true,
            shapes: [
              g([el(29, 33, 18, 18), el(71, 33, 18, 18)], {
                fill: look.color,
                stroke: ink,
                width: 2.5,
              }),
              g([el(29, 33, 8, 8), el(71, 33, 8, 8)], { fill: a }),
            ],
          },
        ]
      case 'bow':
        return [
          { name, shapes: bow(70, 21, { fill: a, stroke: DARK, width: 1 }) },
        ]
      case 'glasses':
        return [
          {
            name,
            shapes: [
              g([el(41, 50, 17, 17), el(59, 50, 17, 17)], {
                stroke: ink,
                width: 2,
              }),
              g([rc(CX, 50, 4, 2, 1)], { fill: ink }),
            ],
          },
        ]
      case 'cap':
        return [
          {
            name,
            shapes: [g([el(CX, 26, 26, 18), rc(63, 31, 20, 4, 2)], outline)],
          },
        ]
      case 'bowler':
        return [
          {
            name,
            shapes: [
              g([rc(CX, 19, 22, 14, 7), rc(CX, 26, 36, 4, 2)], { fill: DARK }),
            ],
          },
        ]
      case 'propeller':
        return [
          {
            name: 'beanie',
            shapes: [g([el(CX, 25, 20, 12), rc(CX, 18, 2, 6, 1)], outline)],
          },
          {
            name: 'blades',
            shapes: [
              g([rc(CX, 15, 30, 4, 2)], {
                fill: palette.white,
                stroke: DARK,
                width: 1.5,
              }),
            ],
            pivot: [CX, 15],
            scale: loop([
              [100, 100, 100],
              [8, 100, 100],
              [100, 100, 100],
              [8, 100, 100],
              [100, 100, 100],
              [8, 100, 100],
              [100, 100, 100],
            ]),
          },
        ]
      case 'sprout':
        return [
          {
            name,
            shapes: [
              rotatedRect(45, 22, 8, 18, 4, outline, -28),
              rotatedRect(56, 21, 8, 18, 4, outline, 28),
            ],
            pivot: [CX, 31],
            rotation: wiggle(14),
          },
        ]
    }
  })

// Motion helpers. Scale values are [x, y, 100] percent, rooted at the feet.
const hop = (height: number, hops: number): Json =>
  loop(
    Array.from({ length: hops * 2 + 1 }, (_, i): Vec => [
      CX,
      FOOT - (i % 2 ? height : 0),
      0,
    ])
  )

/** Squashed on the ground, stretched in the air. */
const squash = (hops: number, wide: number, tall: number): Json =>
  loop(
    Array.from({ length: hops * 2 + 1 }, (_, i): Vec =>
      i % 2
        ? [100 - wide * 0.8, 100 + tall * 1.2, 100]
        : [100 + wide, 100 - tall, 100]
    )
  )

const sway = (deg: number, swings: number): Json =>
  loop(
    Array.from({ length: swings * 2 + 1 }, (_, i) =>
      i % 2 ? deg : i === 0 || i === swings * 2 ? 0 : -deg
    )
  )

const mouthScale = (pairs: Array<[number, number]>): Json =>
  loop(pairs.map(([x, y]): Vec => [x, y, 100]))

type Motion = {
  position?: Json
  rotation?: Json
  scale?: Json
  mouth: Json
  /** Open googly eyes (pupil offsets) or `closed`. */
  pupils?: Array<[number, number]>
  blink?: boolean
  brows?: number
  spark?: boolean
  steam?: boolean
}

const motions: Record<CharacterClip, Motion> = {
  idle: {
    rotation: loop([-4, 4, -4]),
    scale: squash(2, 3, 4),
    mouth: mouthScale([
      [100, 50],
      [115, 75],
      [100, 50],
    ]),
    pupils: [
      [-3, 0],
      [3, 0],
      [0, -2],
      [-3, 0],
    ],
    blink: true,
  },
  talking: {
    position: hop(5, 4),
    rotation: loop([-6, 6, -6, 6, -6]),
    scale: squash(4, 9, 12),
    mouth: mouthScale([
      [90, 30],
      [70, 140],
      [110, 50],
      [75, 150],
      [100, 25],
      [70, 120],
      [105, 45],
      [75, 140],
      [90, 30],
    ]),
    pupils: [
      [2, 1],
      [-2, -1],
      [2, 1],
    ],
  },
  argue: {
    position: hop(3, 4),
    rotation: sway(10, 4),
    scale: squash(4, 8, 10),
    mouth: mouthScale([
      [130, 150],
      [80, 60],
      [130, 150],
      [80, 60],
      [130, 150],
    ]),
    pupils: [
      [0, 2],
      [1, 2],
      [-1, 2],
    ],
    brows: 22,
    steam: true,
  },
  fight: {
    position: loop([
      [CX - 8, FOOT, 0],
      [CX + 8, FOOT - 6, 0],
      [CX - 8, FOOT, 0],
    ]),
    rotation: loop([-20, 20, -20]),
    scale: squash(4, 14, 16),
    mouth: mouthScale([
      [150, 170],
      [90, 100],
      [150, 170],
    ]),
    pupils: [
      [-4, -3],
      [4, 3],
      [-4, 3],
      [4, -3],
      [-4, -3],
    ],
    brows: 30,
    spark: true,
  },
  calm: {
    position: hop(3, 1),
    rotation: loop([-2, 2, -2]),
    scale: squash(1, 4, 6),
    mouth: mouthScale([
      [90, 40],
      [100, 55],
      [90, 40],
    ]),
  },
  break: {
    position: hop(2, 2),
    rotation: sway(8, 2),
    scale: squash(2, 3, 4),
    mouth: mouthScale([
      [90, 35],
      [100, 70],
      [90, 35],
    ]),
  },
}

const star = (x: number, y: number, r: number) => pg(x, y, 5, r, 0, true)

export function buildClip(name: string, look: Look, clip: CharacterClip): Json {
  const m = motions[clip]
  const ink = luminance(look.color) < 0.55 ? palette.white : DARK
  const layers: Json[] = []
  let ind = 1
  const root = ind++
  const add = (n: string, shapes: Json[], o: LayerOpts = {}) =>
    layers.push(layer(ind++, n, shapes, o))
  const child = (n: string, shapes: Json[], o: LayerOpts = {}) =>
    add(n, shapes, { parent: root, ...o })

  if (clip === 'break' && look.drink) {
    child(
      'drink',
      [
        g([rc(80, 72, 15, 20, 3)], {
          fill: look.drink,
          stroke: DARK,
          width: 2,
        }),
        g([el(80, 62, 14, 7)], { fill: palette.white }),
      ],
      {
        pivot: [80, 72],
        position: loop([
          [80, 72, 0],
          [74, 58, 0],
          [80, 72, 0],
        ]),
        rotation: loop([0, -30, 0]),
      }
    )
  }
  if (m.spark) {
    add(
      'spark',
      [
        g([star(82, 24, 12)], {
          fill: palette.danger,
          stroke: DARK,
          width: 1.5,
        }),
      ],
      {
        pivot: [82, 24],
        rotation: loop([0, 40, 0]),
        scale: loop([
          [20, 20, 100],
          [140, 140, 100],
          [20, 20, 100],
        ]),
      }
    )
    add(
      'dizzy',
      [
        g([star(50, 22, 6), star(81, 64, 6), star(19, 64, 6)], {
          fill: palette.main,
          stroke: DARK,
          width: 1,
        }),
      ],
      { pivot: [CX, CY], rotation: loop([0, 360], true) }
    )
  }
  if (m.steam) {
    add(
      'steam',
      [
        g(
          [
            el(22, 34, 9, 9),
            el(78, 34, 9, 9),
            el(18, 26, 6, 6),
            el(82, 26, 6, 6),
          ],
          {
            fill: palette.cardbg,
            stroke: DARK,
            width: 1.5,
          }
        ),
      ],
      {
        pivot: [CX, 30],
        position: loop([
          [CX, 30, 0],
          [CX, 14, 0],
          [CX, 30, 0],
        ]),
        opacity: loop([100, 15, 100]),
      }
    )
  }

  const acc = accessoryLayers(look, ink, look.accent)
  for (const a of acc.filter(x => !x.behind)) child(a.name, a.shapes, a)

  if (m.brows) {
    const brow = (x: number, angle: number) =>
      rotatedRect(x, 40, 14, 4, 2, { fill: ink }, angle)
    child('brows', [brow(40, m.brows), brow(60, -m.brows)])
  }
  child('mouth', [g([mouthPath(CX, 66, 16, 12)], { fill: ink })], {
    pivot: [CX, 66],
    scale: m.mouth,
  })

  const blink = m.blink
    ? loop([100, 100, 100, 8, 100].map((y): Vec => [100, y, 100]))
    : undefined
  if (m.pupils) {
    const [x0, y0] = m.pupils[0] ?? [0, 0]
    child(
      'pupils',
      [g([el(41, 50, 4.5, 4.5), el(59, 50, 4.5, 4.5)], { fill: DARK })],
      {
        pivot: [CX, 50],
        position: loop(
          [...m.pupils, [x0, y0]].map(([x = 0, y = 0]): Vec => [
            CX + x,
            50 + y,
            0,
          ])
        ),
        scale: blink,
      }
    )
    child(
      'eyes',
      [
        g([el(41, 50, 11, 12), el(59, 50, 11, 12)], {
          fill: palette.white,
          stroke: DARK,
          width: 1.8,
        }),
      ],
      { pivot: [CX, 50], scale: blink }
    )
  } else {
    child('eyes', [
      g([rc(41, 50, 9, 2.5, 1.2), rc(59, 50, 9, 2.5, 1.2)], { fill: ink }),
    ])
  }

  child('body', [bodyGroup(look, ink)])
  for (const a of acc.filter(x => x.behind)) child(a.name, a.shapes, a)

  layers.unshift(
    nullLayer(root, {
      pivot: [CX, FOOT],
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
