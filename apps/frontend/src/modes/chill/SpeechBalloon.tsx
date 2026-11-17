import type { ReactNode } from 'react'

export type SpeechBalloonProps = {
  children: ReactNode
  /** Which side the tail points to (where the avatar is). */
  side?: 'left' | 'right'
  /** True while the text is still streaming: shows "…" until there is text. */
  isSpeaking?: boolean
  className?: string
}

const isEmpty = (children: ReactNode) =>
  children === null ||
  children === undefined ||
  children === false ||
  children === ''

/** A comic-style speech balloon with a tail pointing at the speaker. */
export function SpeechBalloon({
  children,
  side = 'left',
  isSpeaking = false,
  className = '',
}: SpeechBalloonProps) {
  const isTyping = isSpeaking && isEmpty(children)
  // A rotated square: its left (or right) corner is the tail.
  const tail =
    side === 'left' ? '-left-1 border-b border-l' : '-right-1 border-t border-r'

  return (
    <div
      className={`bg-surface text-main-text border-schedule-border-grey motion-safe:animate-fade-up relative w-fit max-w-xs rounded-2xl border px-3 py-2 wrap-break-word shadow-sm ${className}`}
    >
      <span
        aria-hidden
        className={`bg-surface border-schedule-border-grey absolute top-4 size-3 rotate-45 ${tail}`}
      />
      {isTyping ? (
        <span className="flex items-center gap-1 py-1">
          <span className="sr-only">…</span>
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              aria-hidden
              className="bg-sidenav-secondary motion-safe:animate-dot size-1.5 rounded-full"
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
