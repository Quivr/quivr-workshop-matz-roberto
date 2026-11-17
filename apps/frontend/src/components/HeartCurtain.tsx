import { useEffect, useEffectEvent, useState, type CSSProperties } from 'react'

import './heart-curtain.css'

const HEART_COUNT = 50
const EMOJIS = ['❤️', '💖', '💘', '💕', '💗']
const SVG_COLORS = ['#ff4d8d', '#f43f5e', '#e11d48', '#fb7185', '#ec4899']
const HEART_PATH =
  'M12 21s-6.7-4.35-9.33-8.2C.6 9.7 2.1 5.5 5.9 5.05 8.1 4.8 9.9 6 12 8.2c2.1-2.2 3.9-3.4 6.1-3.15 3.8.45 5.3 4.65 3.23 7.75C18.7 16.65 12 21 12 21z'
/** The veil and the pill finish by then; hearts may run slightly longer. */
const MIN_DURATION_MS = 3500

type Heart = {
  left: number
  size: number
  delay: number
  duration: number
  sway: number
  swayDuration: number
  rotation: number
  emoji?: string
  color?: string
}

const random = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

function makeHearts(): Heart[] {
  return Array.from({ length: HEART_COUNT }, (_, index) => {
    const isSvg = index % 6 === 0
    return {
      // Stratified so the curtain covers the full width without clumps.
      left: ((index + Math.random()) / HEART_COUNT) * 100,
      size: Math.round(random(16, 44)),
      delay: Math.round(random(0, 700)),
      duration: Math.round(random(1800, 3200)),
      sway: Math.round(random(8, 28)),
      swayDuration: Math.round(random(900, 1600)),
      rotation: Math.round(random(8, 24)),
      ...(isSvg ? { color: pick(SVG_COLORS) } : { emoji: pick(EMOJIS) }),
    }
  }).sort(() => Math.random() - 0.5)
}

type Props = {
  onDone: () => void
}

/** Full-screen falling hearts. Mount with a fresh `key` to replay. */
export function HeartCurtain({ onDone }: Props) {
  const [hearts] = useState(makeHearts)
  const [totalMs] = useState(() =>
    Math.max(
      MIN_DURATION_MS,
      ...hearts.map(heart => heart.delay + heart.duration)
    )
  )
  const handleDone = useEffectEvent(onDone)

  useEffect(() => {
    const timeout = setTimeout(() => handleDone(), totalMs + 100)
    return () => clearTimeout(timeout)
  }, [totalMs])

  return (
    <div
      className="heart-curtain"
      aria-hidden="true"
    >
      <div className="heart-curtain__veil" />
      {hearts.map((heart, index) => (
        <span
          key={index}
          className="heart-curtain__fall"
          style={{
            left: `calc(${heart.left}% - ${heart.size / 2}px)`,
            animationDelay: `${heart.delay}ms`,
            animationDuration: `${heart.duration}ms`,
          }}
        >
          <span
            className="heart-curtain__sway"
            style={
              {
                '--hc-sway': `${heart.sway}px`,
                '--hc-rotation': `${heart.rotation}deg`,
                animationDuration: `${heart.swayDuration}ms`,
                animationDelay: `-${heart.delay}ms`,
              } as CSSProperties
            }
          >
            {heart.emoji ? (
              <span
                className="heart-curtain__emoji"
                style={{ fontSize: heart.size }}
              >
                {heart.emoji}
              </span>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width={heart.size}
                height={heart.size}
                className="heart-curtain__svg"
              >
                <path
                  d={HEART_PATH}
                  fill={heart.color}
                />
              </svg>
            )}
          </span>
        </span>
      ))}
      <div className="heart-curtain__pill">💘 Love radar activated</div>
    </div>
  )
}
