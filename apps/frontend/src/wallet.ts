import { createContext, useContext } from 'react'

/**
 * Fake freemium for the demo, priced in QuivrCoins 🪙 (a made-up
 * currency). Nothing is ever charged: purchases only
 * change the local state below, which is kept in localStorage.
 */
export const FREE = {
  /** Option buttons on cards (plan lunch, send invite, ...). */
  actions: 3,
  /** Swipes in the match deck. */
  swipes: 5,
  superLikes: 1,
  /** Profiles you can see unblurred in the deck. */
  visibleProfiles: 2,
  /** Questions to the assistant: the first one is free, the second needs a Quivr SaaS™ subscription. */
  questions: 1,
}

export type PaywallReason =
  | 'actions'
  | 'swipes'
  | 'super-likes'
  | 'locked-profile'
  | 'browse'
  | 'questions'

export type ProductId =
  | 'swipes-10'
  | 'super-likes-5'
  | 'see-all'
  | 'unlimited-day'
  | 'gold'
  | 'quivr-saas'

export type Product = {
  id: ProductId
  emoji: string
  title: string
  description: string
  price: string
  badge?: string
}

export const PRODUCTS: Product[] = [
  {
    id: 'quivr-saas',
    emoji: '🎓',
    title: 'Quivr SaaS™ Enterprise Plan',
    description:
      'Unlimited questions, scalable curiosity and a dashboard nobody opens. Billed per seat in QuivrCoins, cancelled never (it’s fake).',
    price: '149 QuivrCoins / seat / month',
    badge: 'Enterprise-ready ☁️',
  },
  {
    id: 'unlimited-day',
    emoji: '⚡',
    title: '24h Rizz Pass',
    description:
      'Unlimited swipes and options for a whole day. Side effects may include confidence.',
    price: '499 QuivrCoins',
    badge: 'Most popular 🔥',
  },
  {
    id: 'gold',
    emoji: '👑',
    title: 'Quivr Gold™',
    description:
      'Everything unlimited, see everyone, 5 Super Likes and a tiny imaginary crown.',
    price: '999 QuivrCoins / month',
    badge: 'Best value (trust us)',
  },
  {
    id: 'see-all',
    emoji: '🕶️',
    title: 'X-Ray Goggles',
    description: 'Unblur every mysterious profile on the radar. Very legal.',
    price: '199 QuivrCoins',
  },
  {
    id: 'swipes-10',
    emoji: '👆',
    title: 'Thumb Stamina Pack',
    description: '10 extra swipes and 3 extra options. Stretch first.',
    price: '99 QuivrCoins',
  },
  {
    id: 'super-likes-5',
    emoji: '💘',
    title: 'Cupid’s Ammo ×5',
    description: 'Super Likes. They will know. Oh, they will know.',
    price: '299 QuivrCoins',
  },
]

/** Which product to highlight for each reason the paywall opened. */
export const SUGGESTED: Record<PaywallReason, ProductId> = {
  actions: 'unlimited-day',
  swipes: 'swipes-10',
  'super-likes': 'super-likes-5',
  'locked-profile': 'see-all',
  browse: 'gold',
  questions: 'quivr-saas',
}

export type WalletState = {
  actions: number
  swipes: number
  superLikes: number
  seeAll: boolean
  /** Epoch ms until which everything is unlimited (24h pass). */
  unlimitedUntil: number
  gold: boolean
  /** Free questions left. Quivr SaaS™ and anything unlimited skip this. */
  questions: number
  /** Quivr SaaS™ subscription: unlimited questions. */
  plus: boolean
  /** Fake QuivrCoins "spent", for a cheeky receipt. */
  spentCoins: number
}

export const initialWallet = (): WalletState => ({
  actions: FREE.actions,
  swipes: FREE.swipes,
  superLikes: FREE.superLikes,
  seeAll: false,
  unlimitedUntil: 0,
  gold: false,
  questions: FREE.questions,
  plus: false,
  spentCoins: 0,
})

/** Prices in QuivrCoins 🪙, the demo's fake currency. */
export const COINS: Record<ProductId, number> = {
  'swipes-10': 99,
  'super-likes-5': 299,
  'see-all': 199,
  'unlimited-day': 499,
  gold: 999,
  'quivr-saas': 149,
}

const DAY_MS = 24 * 60 * 60 * 1000

export const applyPurchase = (
  state: WalletState,
  id: ProductId,
  now = Date.now()
): WalletState => {
  const paid = { ...state, spentCoins: state.spentCoins + COINS[id] }
  switch (id) {
    case 'swipes-10':
      return { ...paid, swipes: paid.swipes + 10, actions: paid.actions + 3 }
    case 'super-likes-5':
      return { ...paid, superLikes: paid.superLikes + 5 }
    case 'see-all':
      return { ...paid, seeAll: true }
    case 'unlimited-day':
      return {
        ...paid,
        unlimitedUntil: Math.max(paid.unlimitedUntil, now) + DAY_MS,
      }
    case 'gold':
      return {
        ...paid,
        gold: true,
        seeAll: true,
        superLikes: paid.superLikes + 5,
      }
    case 'quivr-saas':
      return { ...paid, plus: true }
  }
}

export const refillWallet = (state: WalletState): WalletState => ({
  ...state,
  actions: state.actions + FREE.actions,
  swipes: state.swipes + FREE.swipes,
  superLikes: state.superLikes + FREE.superLikes,
  questions: state.questions + FREE.questions,
})

export const isUnlimited = (state: WalletState, now = Date.now()) =>
  state.gold || state.unlimitedUntil > now

export const canAskUnlimited = (state: WalletState, now = Date.now()) =>
  state.plus || isUnlimited(state, now)

/**
 * Uses up one question. Returns the new state, or undefined when the free
 * allowance is gone and the student has no subscription.
 */
export const spendQuestion = (
  state: WalletState,
  now = Date.now()
): WalletState | undefined => {
  if (canAskUnlimited(state, now)) return state
  if (state.questions <= 0) return undefined
  return { ...state, questions: state.questions - 1 }
}

/** Reads a saved wallet, falling back to a fresh one for missing or broken data. */
export const parseWallet = (saved: string | null): WalletState => {
  try {
    return saved
      ? { ...initialWallet(), ...(JSON.parse(saved) as Partial<WalletState>) }
      : initialWallet()
  } catch {
    return initialWallet()
  }
}

export type Wallet = {
  state: WalletState
  isUnlimited: boolean
  /** Whether profile number `index` (0-based, ranked) is visible. */
  canSee: (index: number) => boolean
  /** Spend one option. Returns false and opens the paywall when none are left. */
  spendAction: () => boolean
  /** Spend one swipe. Returns false and opens the paywall when none are left. */
  spendSwipe: () => boolean
  /** Spend one Super Like. Returns false and opens the paywall when none are left. */
  spendSuperLike: () => boolean
  /** Use up one question. Returns false and opens the paywall when the free one is gone. */
  spendQuestion: () => boolean
  openPaywall: (reason: PaywallReason) => void
  /** Free top-up: adds another free allowance of options, swipes and Super Likes. */
  refill: () => void
  reset: () => void
}

export const WalletContext = createContext<Wallet | undefined>(undefined)

export const useWallet = (): Wallet => {
  const wallet = useContext(WalletContext)
  if (!wallet) throw new Error('useWallet needs a <WalletProvider>')
  return wallet
}
