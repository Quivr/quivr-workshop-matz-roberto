/** Everything the bar says by itself. Scripted: no tools, no LLM, no facts. */

/** Gus's replies while he is on his Stella Artois break. */
export const SLEEPY_REPLIES = [
  '*yawn* …on my break, kid. Ask me again in a bit.',
  'Zzz… hm? Not now. Stella break. Come back when the foam has settled.',
  '…on my break… ask me in a bit… zzz…',
  'Shhh. Even bartenders get a break. Ask me after the Stella.',
]

export const sleepyReply = (count: number) =>
  SLEEPY_REPLIES[count % SLEEPY_REPLIES.length] ?? '…zzz…'

/** Gus answers for the whole bar. */
export const RESPONDER_ID = 'gus'

export const BREAK_END_LINE = 'Back from my break. Where were we?'

/** Scripted replies carry this id prefix so the chat can show Gus dozing. */
export const SLEEPY_ID_PREFIX = 'sleepy-'

/** Bram, when Gus heads off. Shown for the first few seconds of the break. */
export const BREAK_BANTER = {
  speaker: 'bram',
  text: 'Gus is on his break, golden friend. Anyway!',
  ms: 6000,
} as const

export type GagLine = {
  speaker: 'pip' | 'gus' | 'bram' | 'stien'
  text: string
}

/** Where Pip is: at the bar, slinking off, gone, or sneaking back in. */
export type PipState = 'here' | 'leaving' | 'away' | 'returning'

export type GagStep = {
  pip: PipState
  /** How long this beat lasts. Must outlast the CSS slide for `leaving`/`returning`. */
  ms: number
  line?: GagLine
}

const LINE_MS = 3000

type Round = {
  ask: string
  refuse: string
  sad: string
  gossip: GagLine
  back: string
  warning: string
}

/** Ask, refused, leaves, a beat of absence, sneaks back, one last warning. */
const round = (r: Round): GagStep[] => [
  { pip: 'here', ms: LINE_MS, line: { speaker: 'pip', text: r.ask } },
  { pip: 'here', ms: LINE_MS, line: { speaker: 'gus', text: r.refuse } },
  { pip: 'here', ms: 2500, line: { speaker: 'pip', text: r.sad } },
  { pip: 'leaving', ms: 1500 },
  { pip: 'away', ms: 3200, line: r.gossip },
  { pip: 'away', ms: 1500 },
  { pip: 'returning', ms: 1500 },
  { pip: 'here', ms: 2600, line: { speaker: 'pip', text: r.back } },
  { pip: 'here', ms: 1800, line: { speaker: 'gus', text: r.warning } },
]

/** The running gag: Pip tries to order a soda, Gus sends him away, Pip leaves and comes back. */
export const GAG_ROUNDS: GagStep[][] = [
  round({
    ask: 'Gus! One cola, please! Extra fizzy!',
    refuse: 'We serve beer. Only beer. Out.',
    sad: '…no bubbles today. Sad Pip.',
    gossip: { speaker: 'bram', text: 'Anyway! Poor Pip, my golden friend.' },
    back: 'Just sitting here. Not ordering anything.',
    warning: "Don't even.",
  }),
  round({
    ask: 'Orange soda? Lemon? A teeny ginger ale?',
    refuse: 'Only beer, Pip. This is a beer establishment.',
    sad: 'Fine. I will go and fizz somewhere else.',
    gossip: {
      speaker: 'stien',
      text: '*hic* A beautiful thing, such determination.',
    },
    back: 'Hi again. I was only looking at the stools.',
    warning: 'No.',
  }),
  round({
    ask: 'What if the soda is… very small?',
    refuse: 'Only. Beer.',
    sad: 'The first sip will come one day…',
    gossip: { speaker: 'bram', text: 'Anyway! Where was I? Oh yes, poor Pip.' },
    back: 'Back. Totally not thinking about soda.',
    warning: 'Still no.',
  }),
]
