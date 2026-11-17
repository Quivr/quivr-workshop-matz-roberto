import type { GagLine } from '../chill/script'

export type ReactionSnapshot = { line: GagLine | null }

const IDLE: ReactionSnapshot = { line: null }

/**
 * What the bar says when the argument has been going on for a while, after
 * `turn` finished turns. Scripted: no tools, no LLM, no facts. Who says it
 * depends on who is around, so nobody speaks while on a break.
 */
export const reactionAt = (
  turn: number,
  away: readonly string[]
): GagLine[] => {
  const gus = !away.includes('gus')
  switch (turn) {
    case 2:
      return [
        gus
          ? { speaker: 'gus', text: 'Oi! Pipe down, the pair of you.' }
          : { speaker: 'stien', text: '*hic* Shhh, everyone, shhh.' },
      ]
    case 4:
      return [
        {
          speaker: 'pip',
          text: 'Sorry to interrupt! Is this a good time for a cola?',
        },
        gus
          ? { speaker: 'gus', text: 'No. Not now, Pip.' }
          : { speaker: 'bram', text: 'Not now, Pip, my golden friend.' },
      ]
    case 6:
      return [
        gus
          ? { speaker: 'gus', text: 'Last warning. Voices down.' }
          : {
              speaker: 'bram',
              text: 'Anyway! Let us all use our indoor voices.',
            },
      ]
    default:
      return []
  }
}

/**
 * Says a few lines one after the other, then goes quiet. One timer at a time;
 * `stop` clears it, so leaving the screen leaves nothing behind.
 */
export function createReactions(lineMs = 3_200) {
  let snapshot: ReactionSnapshot = IDLE
  let timer: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()

  const show = (next: ReactionSnapshot) => {
    snapshot = next
    listeners.forEach(listener => listener())
  }

  const step = (lines: readonly GagLine[], index: number) => {
    const line = lines[index]
    if (!line) {
      timer = undefined
      if (snapshot !== IDLE) show(IDLE)
      return
    }
    show({ line })
    timer = setTimeout(() => step(lines, index + 1), lineMs)
  }

  const stop = () => {
    clearTimeout(timer)
    timer = undefined
    if (snapshot !== IDLE) show(IDLE)
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    /** Replaces whatever is being said. */
    play(lines: readonly GagLine[]) {
      stop()
      step(lines, 0)
    },
    stop,
  }
}

export type Reactions = ReturnType<typeof createReactions>
