/** Hard cap on the number of turns. Nothing runs unattended beyond it. */
export const MAX_TURNS = 8

/** An argument needs at least this many characters who are not away. */
export const MIN_ARGUERS = 2

export type EndReason = 'limit' | 'button' | 'student' | 'error' | 'empty'

export type ArgumentState = {
  status: 'idle' | 'running' | 'ended'
  endReason?: EndReason
  topic: string
  /** The characters, in speaking order. */
  cast: readonly string[]
  /** Finished turns so far. */
  turn: number
  /** Who has the floor right now, or null when nobody has. */
  speaker: string | null
  error?: string
}

export type ArgumentAction =
  | { type: 'start'; topic: string; away?: readonly string[] }
  | { type: 'turnFinished'; away?: readonly string[] }
  | { type: 'turnFailed'; error: string }
  | { type: 'stop' }
  | { type: 'studentMessage' }

export const initialState = (cast: readonly string[]): ArgumentState => ({
  status: 'idle',
  topic: '',
  cast,
  turn: 0,
  speaker: null,
})

/** Round robin: whoever spoke last is followed by the next one in the cast. */
export const speakerForTurn = (
  cast: readonly string[],
  turn: number
): string | null => (cast.length === 0 ? null : cast[turn % cast.length]!)

/**
 * The first character who is not away, looking from position `from` (wrapping
 * round the cast). Null when everybody is away.
 */
export const firstPresent = (
  cast: readonly string[],
  from: number,
  away: readonly string[] = []
): string | null => {
  for (let i = 0; i < cast.length; i++) {
    const id = cast[(from + i) % cast.length]!
    if (!away.includes(id)) return id
  }
  return null
}

/**
 * Who speaks after `after` (nobody has yet: null). Round robin, skipping the
 * characters who are away, so a skipped turn never counts as a turn. With
 * nobody away this is `speakerForTurn`. Null when fewer than MIN_ARGUERS are
 * left to argue.
 */
export const nextSpeaker = (
  cast: readonly string[],
  away: readonly string[],
  after: string | null
): string | null => {
  if (cast.filter(id => !away.includes(id)).length < MIN_ARGUERS) return null
  return firstPresent(cast, after === null ? 0 : cast.indexOf(after) + 1, away)
}

const end = (
  state: ArgumentState,
  endReason: EndReason,
  error?: string
): ArgumentState => ({
  ...state,
  status: 'ended',
  endReason,
  speaker: null,
  error,
})

/** Pure turn-taking state machine. Actions that arrive after the end are ignored. */
export const argumentReducer = (
  state: ArgumentState,
  action: ArgumentAction
): ArgumentState => {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state
      const first = nextSpeaker(state.cast, action.away ?? [], null)
      if (first === null) {
        return end({ ...state, topic: action.topic }, 'empty')
      }
      return {
        ...state,
        status: 'running',
        topic: action.topic,
        speaker: first,
      }

    case 'turnFinished': {
      if (state.status !== 'running') return state
      const turn = state.turn + 1
      if (turn >= MAX_TURNS) return end({ ...state, turn }, 'limit')
      const speaker = nextSpeaker(state.cast, action.away ?? [], state.speaker)
      if (speaker === null) return end({ ...state, turn }, 'empty')
      return { ...state, turn, speaker }
    }

    case 'turnFailed':
      if (state.status !== 'running') return state
      return end(state, 'error', action.error)

    case 'stop':
      if (state.status !== 'running') return state
      return end(state, 'button')

    case 'studentMessage':
      if (state.status !== 'running') return state
      return end(state, 'student')
  }
}
