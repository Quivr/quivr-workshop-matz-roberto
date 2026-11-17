import {
  Component,
  lazy,
  Suspense,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { getCharacter } from './registry'
import type { CharacterClip } from './types'

// lottie-web is ~300 KB: keep it out of the first load. It is fetched once,
// the first time any avatar renders.
const AnimatedAvatar = lazy(() => import('./AnimatedAvatar'))

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}

/** A failed chunk load (offline, deploy in between) leaves the placeholder. */
class LoadBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

type Props = {
  characterId: string
  clip?: CharacterClip
  size?: number
  className?: string
}

export function CharacterAvatar({
  characterId,
  clip = 'idle',
  size = 64,
  className = '',
}: Props) {
  const character = getCharacter(characterId)
  const reduced = useReducedMotion()

  if (!character) {
    return (
      <span
        role="img"
        aria-label="Unknown character"
        className={`bg-cardbg font-title text-main-text inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
        style={{ width: size, height: size, fontSize: size / 2 }}
      >
        ?
      </span>
    )
  }

  const placeholder = (
    <span
      aria-hidden="true"
      className="bg-main-text/10 m-auto rounded-full"
      style={{ width: size * 0.7, height: size * 0.7 }}
    />
  )

  return (
    <span
      role="img"
      aria-label={character.name}
      className={`inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <LoadBoundary fallback={placeholder}>
        <Suspense fallback={placeholder}>
          <AnimatedAvatar
            characterId={characterId}
            clip={clip}
            size={size}
            reduced={reduced}
          />
        </Suspense>
      </LoadBoundary>
    </span>
  )
}
