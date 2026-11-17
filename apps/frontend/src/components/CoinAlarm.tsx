import { useEffect, useRef } from 'react'

import type { PaywallReason } from '../wallet'
import './coin-alarm.css'

const WHAT: Record<PaywallReason, string> = {
  actions: 'Tapping more options',
  swipes: 'More swiping',
  'super-likes': 'Another Super Like',
  'locked-profile': 'Seeing this mystery person',
  browse: 'This',
  questions: 'Another question',
}

const SIRENS = ['🚨', '🚨', '🚨', '🚨', '🚨', '🚨']
const FLOATERS = ['🚨', '⚠️', '🪙', '🔔', '🚨', '💸', '⚠️', '🪙', '📢', '🚨']

type Props = {
  reason: PaywallReason
  onContinue: () => void
  onRefill: () => void
}

/** Full-screen "you need QuivrCoins" alarm, shown right before the shop opens. */
export function CoinAlarm({ reason, onContinue, onRefill }: Props) {
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    button.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onContinue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onContinue])

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="coin-alarm-title"
      aria-describedby="coin-alarm-text"
      className="coin-alarm"
      onClick={onContinue}
    >
      <div
        className="coin-alarm__flash"
        aria-hidden
      />
      <div
        className="coin-alarm__floaters"
        aria-hidden
      >
        {FLOATERS.map((emoji, index) => (
          <span
            key={index}
            style={{
              left: `${5 + index * 9.5}%`,
              animationDelay: `${(index % 5) * 0.18}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>
      <div className="coin-alarm__panel">
        <div
          className="coin-alarm__sirens"
          aria-hidden
        >
          {SIRENS.map((siren, index) => (
            <span
              key={index}
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              {siren}
            </span>
          ))}
        </div>
        <p className="coin-alarm__eyebrow">⚠️ Wallet alert ⚠️</p>
        <h2
          id="coin-alarm-title"
          className="coin-alarm__title font-title"
        >
          QuivrCoins required!
        </h2>
        <p
          id="coin-alarm-text"
          className="coin-alarm__text"
        >
          {WHAT[reason]} costs <strong>🪙 QuivrCoins</strong>. Your free
          allowance has left the building. 🏃‍♂️💨
        </p>
        <div className="coin-alarm__actions">
          <button
            ref={button}
            type="button"
            className="coin-alarm__button coin-alarm__button--free"
            onClick={event => {
              event.stopPropagation()
              onRefill()
            }}
          >
            🎁 Free QuivrCoins, keep going!
          </button>
          <button
            type="button"
            className="coin-alarm__button"
            onClick={event => {
              event.stopPropagation()
              onContinue()
            }}
          >
            🪙 Visit the shop
          </button>
        </div>
        <p className="coin-alarm__small">
          Demo parody. No real money involved, ever.
        </p>
      </div>
    </div>
  )
}
