import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import {
  applyPurchase,
  FREE,
  initialWallet,
  refillWallet,
  isUnlimited,
  WalletContext,
  type PaywallReason,
  type ProductId,
  type Wallet,
  type WalletState,
} from '../wallet'
import { CoinAlarm } from './CoinAlarm'
import { Paywall } from './Paywall'

const STORAGE_KEY = 'ask-quivr.wallet'

const load = (): WalletState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved
      ? { ...initialWallet(), ...(JSON.parse(saved) as Partial<WalletState>) }
      : initialWallet()
  } catch {
    return initialWallet()
  }
}

/** Holds the fake wallet and shows the paywall when a free limit is hit. */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load)
  const [paywall, setPaywall] = useState<PaywallReason>()
  const [alarm, setAlarm] = useState<PaywallReason>()
  // Mirrors `state` so spend* can answer synchronously within one click.
  const latest = useRef(state)

  useEffect(() => {
    latest.current = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const unlimited = isUnlimited(state)

  // Hitting a limit sounds the alarm first; browsing the shop goes straight in.
  const openPaywall = useCallback((reason: PaywallReason) => {
    if (reason === 'browse') setPaywall(reason)
    else setAlarm(reason)
  }, [])

  const continueToShop = useCallback(() => {
    setAlarm(current => {
      if (current) setPaywall(current)
      return undefined
    })
  }, [])

  const spend =
    (key: 'actions' | 'swipes' | 'superLikes', reason: PaywallReason) => () => {
      const current = latest.current
      if (isUnlimited(current)) return true
      if (current[key] <= 0) {
        openPaywall(reason)
        return false
      }
      const next = { ...current, [key]: current[key] - 1 }
      latest.current = next
      setState(next)
      return true
    }

  const wallet: Wallet = {
    state,
    isUnlimited: unlimited,
    canSee: index => unlimited || state.seeAll || index < FREE.visibleProfiles,
    spendAction: spend('actions', 'actions'),
    spendSwipe: spend('swipes', 'swipes'),
    spendSuperLike: spend('superLikes', 'super-likes'),
    openPaywall,
    refill: () => {
      const next = refillWallet(latest.current)
      latest.current = next
      setState(next)
    },
    reset: () => {
      const fresh = initialWallet()
      latest.current = fresh
      setState(fresh)
    },
  }

  const handleBuy = (id: ProductId) => {
    const next = applyPurchase(latest.current, id)
    latest.current = next
    setState(next)
  }

  return (
    <WalletContext value={wallet}>
      {children}
      {alarm && (
        <CoinAlarm
          reason={alarm}
          onContinue={continueToShop}
          onRefill={() => {
            wallet.refill()
            setAlarm(undefined)
          }}
        />
      )}
      {paywall && !alarm && (
        <Paywall
          key={paywall}
          reason={paywall}
          wallet={wallet}
          onBuy={handleBuy}
          onClose={() => setPaywall(undefined)}
        />
      )}
    </WalletContext>
  )
}
