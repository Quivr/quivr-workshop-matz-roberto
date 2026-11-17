/** An argument needs at least this many characters who are not away. */
export const MIN_ARGUERS = 2

/**
 * Why an argument ended for good. Only the button, an error, too few
 * characters, or a configured turn limit end it: a student message does not.
 */
export type EndReason = 'limit' | 'button' | 'error' | 'empty'

/**
 * - running: the characters take turns;
 * - answering: the student stepped in, one character answers them;
 * - calm: the beat after the answer, before they pick the fight back up;
 * - ended: over for good.
 */
export type ArgumentStatus = 'idle' | 'running' | 'answering' | 'calm' | 'ended'

export type ArgumentState = {
  status: ArgumentStatus
  endReason?: EndReason
  topic: string
  /** The characters, in speaking order. */
  cast: readonly string[]
  /** Finished turns so far. */
  turn: number
  /** Who has the floor right now, or null when nobody has. */
  speaker: string | null
  /** Who had the floor when the student stepped in: the order goes on after them. */
  floor: string | null
  /** True from the moment they pick the argument up again until that turn is done. */
  resuming: boolean
  /** Optional cap on finished turns. Null (the default) means no cap. */
  maxTurns: number | null
  error?: string
}

export type ArgumentAction =
  | { type: 'start'; topic: string; away?: readonly string[] }
  | { type: 'turnFinished'; away?: readonly string[] }
  | { type: 'turnFailed'; error: string }
  | { type: 'stop' }
  | { type: 'studentMessage' }
  | { type: 'answered' }
  | { type: 'resume'; away?: readonly string[] }

export const initialState = (
  cast: readonly string[],
  maxTurns: number | null = null
): ArgumentState => ({
  status: 'idle',
  topic: '',
  cast,
  turn: 0,
  speaker: null,
  floor: null,
  resuming: false,
  maxTurns,
})

/** Still going, in any of its three live phases: "Stop it!" ends all of them. */
export const isActive = (state: ArgumentState): boolean =>
  state.status === 'running' ||
  state.status === 'answering' ||
  state.status === 'calm'

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
  floor: null,
  resuming: false,
  error,
})

/**
 * Pure turn-taking state machine. Actions that arrive after the end are
 * ignored, and so are the ones that make no sense in the current phase.
 */
export const argumentReducer = (
  state: ArgumentState,
  action: ArgumentAction
): ArgumentState => {
  switch (action.type) {
    case 'start': {
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
    }

    case 'turnFinished': {
      if (state.status !== 'running') return state
      const turn = state.turn + 1
      if (state.maxTurns !== null && turn >= state.maxTurns) {
        return end({ ...state, turn }, 'limit')
      }
      const speaker = nextSpeaker(state.cast, action.away ?? [], state.speaker)
      if (speaker === null) return end({ ...state, turn }, 'empty')
      return { ...state, turn, speaker, resuming: false }
    }

    case 'turnFailed':
      if (!isActive(state)) return state
      return end(state, 'error', action.error)

    // Final: whatever phase it is in, "Stop it!" ends the argument for good.
    case 'stop':
      if (!isActive(state)) return state
      return end(state, 'button')

    // Temporary: the characters calm down, one answers, then they go on.
    case 'studentMessage':
      if (state.status === 'running') {
        return {
          ...state,
          status: 'answering',
          floor: state.speaker,
          speaker: null,
          resuming: false,
        }
      }
      if (state.status === 'calm') return { ...state, status: 'answering' }
      return state

    case 'answered':
      if (state.status !== 'answering') return state
      return { ...state, status: 'calm' }

    case 'resume': {
      if (state.status !== 'calm') return state
      const speaker = nextSpeaker(state.cast, action.away ?? [], state.floor)
      if (speaker === null) return end(state, 'empty')
      return {
        ...state,
        status: 'running',
        speaker,
        floor: null,
        resuming: true,
      }
    }
  }
}
