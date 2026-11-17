/** Hard cap on the number of turns. Nothing runs unattended beyond it. */
export const MAX_TURNS = 8

export type EndReason = 'limit' | 'button' | 'student' | 'error'

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
  | { type: 'start'; topic: string }
  | { type: 'turnFinished' }
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
      return {
        ...state,
        status: 'running',
        topic: action.topic,
        speaker: speakerForTurn(state.cast, 0),
      }

    case 'turnFinished': {
      if (state.status !== 'running') return state
      const turn = state.turn + 1
      if (turn >= MAX_TURNS) return end({ ...state, turn }, 'limit')
      return { ...state, turn, speaker: speakerForTurn(state.cast, turn) }
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
