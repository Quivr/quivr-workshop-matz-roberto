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

/** Looping keyframes: `values` are spread evenly over the clip and end where they start. */
export const loop = (values: Array<number | Vec>): Json => {
  const last = values.length - 1
  return {
    a: 1,
    k: values.map((v, i) => {
      const s = Array.isArray(v) ? v : [v]
      return i === last
        ? { t: FRAMES, s }
        : {
            t: Math.round((i * FRAMES) / last),
            s,
            i: { x: 0.5, y: 1 },
            o: { x: 0.5, y: 0 },
          }
    }),
  }
}

export const prop = (v: number | Vec | Json): Json =>
  typeof v === 'object' && !Array.isArray(v) ? v : still(v)

const fill = (hex: string, opacity = 100): Json => ({
  ty: 'fl',
  c: still(hexToLottie(hex)),
  o: still(opacity),
  r: 1,
})

const stroke = (hex: string, w: number): Json => ({
  ty: 'st',
  c: still(hexToLottie(hex)),
  o: still(100),
  w: still(w),
})

export type Paint = { fill?: string; stroke?: string; width?: number }

const paint = (p: Paint): Json[] => [
  ...(p.stroke ? [stroke(p.stroke, p.width ?? 2)] : []),
  ...(p.fill ? [fill(p.fill)] : []),
]

const group = (geometry: Json, p: Paint, rotation = 0): Json => ({
  ty: 'gr',
  it: [
    geometry,
    ...paint(p),
    {
      ty: 'tr',
      p: still([0, 0]),
      a: still([0, 0]),
      s: still([100, 100]),
      r: still(rotation),
      o: still(100),
    },
  ],
})

export const ellipse = (x: number, y: number, w: number, h: number, p: Paint) =>
  group({ ty: 'el', p: still([x, y]), s: still([w, h]) }, p)

/** A rect, optionally rotated around its own centre. */
export const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  p: Paint,
  rotation = 0
): Json => ({
  ty: 'gr',
  it: [
    { ty: 'rc', p: still([0, 0]), s: still([w, h]), r: still(radius) },
    ...paint(p),
    {
      ty: 'tr',
      p: still([x, y]),
      a: still([0, 0]),
      s: still([100, 100]),
      r: still(rotation),
      o: still(100),
    },
  ],
})

/** Regular polygon (`star: false`) or star, first point at the top. */
export const poly = (
  x: number,
  y: number,
  points: number,
  radius: number,
  p: Paint,
  rotation = 0,
  star = false
): Json =>
  group(
    {
      ty: 'sr',
      sy: star ? 1 : 2,
      pt: still(points),
      p: still([x, y]),
      r: still(rotation),
      or: still(radius),
      os: still(0),
      ...(star ? { ir: still(radius * 0.45), is: still(0) } : {}),
    },
    p
  )

/** Closed half-ellipse (a smiling mouth), `w` wide and `h` deep, top edge at y. */
export const mouthShape = (
  x: number,
  y: number,
  w: number,
  h: number,
  p: Paint
) => {
  const hw = w / 2
  const k = 0.55
  return group(
    {
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
    },
    p
  )
}

export type LayerOpts = {
  /** Pivot for rotation and scale; also where the layer sits at rest. */
  pivot?: [number, number]
  parent?: number
  position?: Json
  rotation?: Json
  scale?: Json
  opacity?: Json
}

export const layer = (
  ind: number,
  name: string,
  shapes: Json[],
  o: LayerOpts = {}
): Json => {
  const [px, py] = o.pivot ?? [0, 0]
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ...(o.parent ? { parent: o.parent } : {}),
    ks: {
      o: prop(o.opacity ?? 100),
      r: prop(o.rotation ?? 0),
      p: prop(o.position ?? [px, py, 0]),
      a: still([px, py, 0]),
      s: prop(o.scale ?? [100, 100, 100]),
    },
    ao: 0,
    shapes,
    ip: 0,
    op: FRAMES,
    st: 0,
    bm: 0,
  }
}

/** Invisible parent that carries the whole-body motion. */
export const nullLayer = (ind: number, o: LayerOpts): Json => {
  const [px, py] = o.pivot ?? [0, 0]
  return {
    ddd: 0,
    ind,
    ty: 3,
    nm: 'root',
    sr: 1,
    ks: {
      o: still(0),
      r: prop(o.rotation ?? 0),
      p: prop(o.position ?? [px, py, 0]),
      a: still([px, py, 0]),
      s: prop(o.scale ?? [100, 100, 100]),
    },
    ao: 0,
    ip: 0,
    op: FRAMES,
    st: 0,
    bm: 0,
  }
}

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
