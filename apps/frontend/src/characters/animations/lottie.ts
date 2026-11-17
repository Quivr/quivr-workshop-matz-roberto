// Tiny helpers to write Lottie JSON by hand. Composition is 100x100, 30 fps.
export type Json = Record<string, unknown>
export type Vec = number[]

export const FRAMES = 60

export const hexToLottie = (hex: string): Vec => {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.round((v / 255) * 1000) / 1000
  return [c(n >> 16), c((n >> 8) & 255), c(n & 255), 1]
}

export const luminance = (hex: string): number => {
  const [r = 0, g = 0, b = 0] = hexToLottie(hex)
  return 0.299 * r + 0.587 * g + 0.114 * b
}

export const still = (k: number | Vec | Json): Json => ({ a: 0, k })

/**
 * Looping keyframes: `values` are spread evenly over the clip and end where they
 * start. Eased by default; `linear` for constant-speed spins.
 */
export const loop = (values: Array<number | Vec>, linear = false): Json => {
  const last = values.length - 1
  const ease = linear
    ? { i: { x: 1, y: 1 }, o: { x: 0, y: 0 } }
    : { i: { x: 0.5, y: 1 }, o: { x: 0.5, y: 0 } }
  return {
    a: 1,
    k: values.map((v, i) => {
      const s = Array.isArray(v) ? v : [v]
      return i === last
        ? { t: FRAMES, s }
        : { t: Math.round((i * FRAMES) / last), s, ...ease }
    }),
  }
}

export const prop = (v: number | Vec | Json): Json =>
  typeof v === 'object' && !Array.isArray(v) ? v : still(v)

export type Paint = {
  fill?: string
  stroke?: string
  width?: number
  opacity?: number
}

const paint = (p: Paint): Json[] => [
  ...(p.stroke
    ? [
        {
          ty: 'st',
          c: still(hexToLottie(p.stroke)),
          o: still(100),
          w: still(p.width ?? 2),
        },
      ]
    : []),
  ...(p.fill
    ? [
        {
          ty: 'fl',
          c: still(hexToLottie(p.fill)),
          o: still(p.opacity ?? 100),
          r: 1,
        },
      ]
    : []),
]

/** Geometry: positions are absolute in the 100x100 composition. */
export const el = (x: number, y: number, w: number, h: number): Json => ({
  ty: 'el',
  p: still([x, y]),
  s: still([w, h]),
})

export const rc = (
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): Json => ({
  ty: 'rc',
  p: still([x, y]),
  s: still([w, h]),
  r: still(radius),
})

/** Regular polygon (or star), first point at the top. */
export const pg = (
  x: number,
  y: number,
  points: number,
  radius: number,
  rotation = 0,
  star = false
): Json => ({
  ty: 'sr',
  sy: star ? 1 : 2,
  pt: still(points),
  p: still([x, y]),
  r: still(rotation),
  or: still(radius),
  os: still(0),
  ...(star ? { ir: still(radius * 0.45), is: still(0) } : {}),
})

/** Closed half-ellipse (a smiling mouth), `w` wide and `h` deep, top edge at y. */
export const mouthPath = (x: number, y: number, w: number, h: number): Json => {
  const hw = w / 2
  const k = 0.55
  return {
    ty: 'sh',
    ks: still({
      c: true,
      v: [
        [x - hw, y],
        [x, y + h],
        [x + hw, y],
      ],
      i: [
        [0, 0],
        [-hw * k, 0],
        [0, h * k],
      ],
      o: [
        [0, h * k],
        [hw * k, 0],
        [0, 0],
      ],
    }),
  }
}

/** One group: all geometries share a paint and one (optional) rotation about `at`. */
export const g = (
  geos: Json[],
  p: Paint,
  rotation = 0,
  at: [number, number] = [0, 0]
): Json => ({
  ty: 'gr',
  it: [
    ...geos,
    ...paint(p),
    {
      ty: 'tr',
      p: still(at),
      a: still([0, 0]),
      s: still([100, 100]),
      r: still(rotation),
      o: still(100),
    },
  ],
})

/** A rect rotated around its own centre. */
export const rotatedRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  p: Paint,
  rotation: number
): Json => g([rc(0, 0, w, h, radius)], p, rotation, [x, y])

export type LayerOpts = {
  /** Pivot for rotation and scale; also where the layer sits at rest. */
  pivot?: [number, number]
  parent?: number
  position?: Json
  rotation?: Json
  scale?: Json
  opacity?: Json
}

const transform = (o: LayerOpts) => {
  const [px, py] = o.pivot ?? [0, 0]
  return {
    o: prop(o.opacity ?? 100),
    r: prop(o.rotation ?? 0),
    p: prop(o.position ?? [px, py, 0]),
    a: still([px, py, 0]),
    s: prop(o.scale ?? [100, 100, 100]),
  }
}

const base = { ddd: 0, sr: 1, ao: 0, ip: 0, op: FRAMES, st: 0, bm: 0 }

export const layer = (
  ind: number,
  name: string,
  shapes: Json[],
  o: LayerOpts = {}
): Json => ({
  ...base,
  ind,
  ty: 4,
  nm: name,
  ...(o.parent ? { parent: o.parent } : {}),
  ks: transform(o),
  shapes,
})

/** Invisible parent that carries the whole-body motion. */
export const nullLayer = (ind: number, o: LayerOpts): Json => ({
  ...base,
  ind,
  ty: 3,
  nm: 'root',
  ks: { ...transform(o), o: still(0) },
})

export const composition = (name: string, layers: Json[]): Json => ({
  v: '5.7.0',
  fr: 30,
  ip: 0,
  op: FRAMES,
  w: 100,
  h: 100,
  nm: name,
  ddd: 0,
  assets: [],
  layers,
})
