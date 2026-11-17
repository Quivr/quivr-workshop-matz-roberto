import type { ReactNode } from 'react'

export type SpeechBalloonProps = {
  children: ReactNode
  /** Which side the tail points to. */
  side?: 'left' | 'right'
  /** True while the text is still streaming. */
  isSpeaking?: boolean
  /** Width and text size are the caller's: the balloon has no opinion on them. */
  className?: string
}

const isEmpty = (children: ReactNode) =>
  children === null ||
  children === undefined ||
  children === false ||
  children === ''

/** A comic-style speech balloon whose tail points at the speaker's avatar. */
export function SpeechBalloon({
  children,
  side = 'left',
  isSpeaking = false,
  className = '',
}: SpeechBalloonProps) {
  const isWaiting = isSpeaking && isEmpty(children)
  // A square turned 45 degrees: only the two borders on the pointing corner stay.
  const tail =
    side === 'left'
      ? '-left-1.5 border-b border-l'
      : '-right-1.5 border-t border-r'

  return (
    <div
      aria-busy={isSpeaking}
      className={`bg-surface text-main-text border-schedule-border-grey motion-safe:animate-fade-up relative rounded-2xl border px-3 py-2 wrap-break-word shadow-sm ${className}`}
    >
      <span
        aria-hidden
        className={`bg-surface border-schedule-border-grey absolute top-4 size-3 rotate-45 ${tail}`}
      />
      {isWaiting ? (
        <span
          role="status"
          aria-label="Speaking"
          className="flex items-center gap-1 py-1"
        >
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              aria-hidden
              className="bg-muted motion-safe:animate-dot size-1.5 rounded-full"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      ) : (
        children
      )}
    </div>
  )
}
