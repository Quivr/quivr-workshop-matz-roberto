import LottieModule, { type LottieRefCurrentProps } from 'lottie-react'
import { useEffect, useRef, useSyncExternalStore } from 'react'

import { getCharacter } from './registry'
import type { CharacterClip } from './types'

// lottie-react is CJS-only in Vite's dev pre-bundle: the default import can be
// the module object ({ default: Lottie }) instead of the component.
const Lottie = (
  'default' in LottieModule
    ? (LottieModule as unknown as { default: typeof LottieModule }).default
    : LottieModule
) as typeof LottieModule

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
  const lottieRef = useRef<LottieRefCurrentProps>(null)

  useEffect(() => {
    if (reduced) lottieRef.current?.goToAndStop(0, true)
    else lottieRef.current?.play()
  }, [reduced])

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

  const data = character.animations[clip] ?? character.animations.idle

  return (
    <span
      role="img"
      aria-label={character.name}
      className={`inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={data}
        loop
        autoplay={!reduced}
        style={{ width: size, height: size }}
      />
    </span>
  )
}
