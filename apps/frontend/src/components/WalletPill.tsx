import { useState } from 'react'

import { useWallet } from '../wallet'
import { QuivrCoin } from './Paywall'
import './paywall.css'

/** A number that does a little bounce whenever it changes. */
function BumpNumber({ value }: { value: number }) {
  const [previous, setPrevious] = useState(value)
  const [bumps, setBumps] = useState(0)
  if (previous !== value) {
    setPrevious(value)
    setBumps(count => count + 1)
  }
  return (
    <span
      key={bumps}
      className={[
        'pw-pill__num',
        bumps > 0 && 'pw-bump',
        value <= 0 && 'pw-pill__num--empty',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {value}
    </span>
  )
}

/** Header pill with the free moves left in the fake wallet. Opens the shop. */
export function WalletPill() {
  const wallet = useWallet()
  const { actions, swipes, superLikes, gold, unlimitedUntil } = wallet.state

  if (wallet.isUnlimited) {
    const until = new Date(unlimitedUntil).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    const label = gold
      ? 'Quivr Gold™ active: everything is unlimited.'
      : `24h Rizz Pass active until ${until}: everything is unlimited.`
    return (
      <button
        type="button"
        className="pw-pill pw-pill--vip"
        title={`${label}\nClick to visit the (fake) Love Shop.`}
        aria-label={`${label} Open the Love Shop.`}
        onClick={() => wallet.openPaywall('browse')}
      >
        <span>{gold ? '👑 Gold' : '⚡ Unlimited'}</span>
        <span className="pw-pill__shop">
          <QuivrCoin />
        </span>
      </button>
    )
  }

  const summary = `${actions} free options, ${swipes} swipes and ${superLikes} Super ${superLikes === 1 ? 'Like' : 'Likes'} left.`
  return (
    <button
      type="button"
      className="pw-pill"
      title={[
        'Free moves left in your demo wallet:',
        `🎟 ${actions} options (plan lunch, send invite…)`,
        `👆 ${swipes} swipes`,
        `💘 ${superLikes} Super ${superLikes === 1 ? 'Like' : 'Likes'}`,
        'Click to buy more with (fake) QuivrCoins.',
      ].join('\n')}
      aria-label={`Demo wallet: ${summary} Open the Love Shop.`}
      onClick={() => wallet.openPaywall('browse')}
    >
      <span className="pw-pill__item">
        <span aria-hidden="true">🎟</span>
        <BumpNumber value={actions} />
      </span>
      <span
        className="pw-pill__sep"
        aria-hidden="true"
      >
        ·
      </span>
      <span className="pw-pill__item">
        <span aria-hidden="true">👆</span>
        <BumpNumber value={swipes} />
      </span>
      <span
        className="pw-pill__sep"
        aria-hidden="true"
      >
        ·
      </span>
      <span className="pw-pill__item">
        <span aria-hidden="true">💘</span>
        <BumpNumber value={superLikes} />
      </span>
      <span className="pw-pill__shop">
        <QuivrCoin />
      </span>
    </button>
  )
}
