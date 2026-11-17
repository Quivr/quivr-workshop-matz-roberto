/** Hard cap on the number of turns. Nothing runs unattended beyond it. */
export const MAX_TURNS = 8

export type Heard = { id: string; from: string; text: string }

export type EndReason = 'limit' | 'button' | 'student' | 'error'

export type ArgumentState = {
  status: 'idle' | 'running' | 'ended'
  endReason?: EndReason
  topic: string
  /** The characters, in speaking order. */
  cast: readonly string[]
  /** Finished turns so far. */
  turn: number
  /** Who is speaking right now, or null when nobody is. */
  speaker: string | null
  /** What each character has heard from the others but not yet been given. */
  inbox: Readonly<Record<string, readonly Heard[]>>
  error?: string
}

export type ArgumentAction =
  | { type: 'start'; topic: string }
  | { type: 'delivered'; characterId: string }
  | { type: 'turnFinished'; text: string }
  | { type: 'turnFailed'; error: string }
  | { type: 'stop' }
  | { type: 'studentMessage' }

export const initialState = (cast: readonly string[]): ArgumentState => ({
  status: 'idle',
  topic: '',
  cast,
  turn: 0,
  speaker: null,
  inbox: Object.fromEntries(cast.map(id => [id, []])),
})

/** Round robin: whoever spoke last is followed by the next one in the cast. */
export const speakerForTurn = (
  cast: readonly string[],
  turn: number
): string | null => (cast.length === 0 ? null : cast[turn % cast.length]!)

export const isRunning = (state: ArgumentState) => state.status === 'running'

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

    case 'delivered':
      return {
        ...state,
        inbox: { ...state.inbox, [action.characterId]: [] },
      }

    case 'turnFinished': {
      if (state.status !== 'running' || state.speaker === null) return state
      const text = action.text.trim()
      if (!text) return end(state, 'error', 'Nobody said anything.')
      const speaker = state.speaker
      const heard: Heard = { id: `turn-${state.turn + 1}`, from: speaker, text }
      const inbox = Object.fromEntries(
        state.cast.map(id => [
          id,
          id === speaker ? state.inbox[id]! : [...state.inbox[id]!, heard],
        ])
      )
      const turn = state.turn + 1
      if (turn >= MAX_TURNS) return end({ ...state, turn, inbox }, 'limit')
      return {
        ...state,
        turn,
        inbox,
        speaker: speakerForTurn(state.cast, turn),
      }
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
