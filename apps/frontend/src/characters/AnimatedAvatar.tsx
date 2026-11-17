import LottieModule, { type LottieRefCurrentProps } from 'lottie-react'
import { useEffect, useRef } from 'react'

import { getCharacter } from './registry'
import type { CharacterClip } from './types'

// lottie-react is CJS-only in Vite's dev pre-bundle: the default import can be
// the module object ({ default: Lottie }) instead of the component.
const Lottie = (
  'default' in LottieModule
    ? (LottieModule as unknown as { default: typeof LottieModule }).default
    : LottieModule
) as typeof LottieModule

type Props = {
  characterId: string
  clip: CharacterClip
  size: number
  reduced: boolean
}

/** The only module that imports lottie-react. Loaded on demand by CharacterAvatar. */
export default function AnimatedAvatar({
  characterId,
  clip,
  size,
  reduced,
}: Props) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)

  useEffect(() => {
    if (reduced) lottieRef.current?.goToAndStop(0, true)
    else lottieRef.current?.play()
  }, [reduced])

  const character = getCharacter(characterId)
  if (!character) return null
  const data = character.animations[clip] ?? character.animations.idle

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={data}
      loop
      autoplay={!reduced}
      style={{ width: size, height: size }}
    />
  )
}
