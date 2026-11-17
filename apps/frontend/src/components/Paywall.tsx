import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'

import {
  COINS,
  PRODUCTS,
  SUGGESTED,
  type PaywallReason,
  type Product,
  type ProductId,
  type Wallet,
} from '../wallet'
import './paywall.css'

type Props = {
  reason: PaywallReason
  wallet: Wallet
  onBuy: (id: ProductId) => void
  onClose: () => void
}

type Phase = 'shop' | 'paying' | 'done'

const HEADLINES: Record<PaywallReason, { title: string; subtitle: string }> = {
  actions: {
    title: 'WHOA THERE, CASANOVA 🛑',
    subtitle: 'You’ve used your 3 free moves. Cupid charges overtime.',
  },
  swipes: {
    title: 'YOUR THUMB IS TIRED 👆😮‍💨',
    subtitle: 'Out of free swipes. Doctors recommend… buying more.',
  },
  'super-likes': {
    title: 'OUT OF CUPID AMMO 🏹',
    subtitle: 'Your Super Like quiver is empty.',
  },
  'locked-profile': {
    title: 'WHO IS THIS MYSTERY HOTTIE?? 🕵️',
    subtitle: 'Unblur them for less than a croque at Alma.',
  },
  browse: {
    title: 'WELCOME TO THE LOVE SHOP 🪙',
    subtitle: 'Totally fake. Totally irresistible.',
  },
  questions: {
    title: 'CURIOSITY IS A PREMIUM FEATURE 🧠💸',
    subtitle:
      'Your 1 free question is spent. Question #2 requires a Quivr SaaS™ Enterprise seat. (Fake, nothing is charged.)',
  },
}

const MASCOT_LINES = [
  'Psst… 87% of Lotte’s matches have Gold.* *we made that up',
  'Have you tried being rich?',
  'This is a parody. Your wallet is safe. Mostly.',
  '1 QuivrCoin = 1 QuivrCoin. Economics!',
  'Love is free. Features cost QuivrCoins.',
  'I accept QuivrCoins, hugs and Alma meal tickets.',
]

const CHECKOUT_STEPS = [
  'Contacting Cupid’s bank…',
  'Minting fresh QuivrCoins…',
  'Converting tears to QuivrCoins…',
  'Asking your mum…',
  'Polishing your QuivrCoins…',
  'Bribing the algorithm…',
]
const STEP_MS = 380
const MASCOT_MS = 2500
const OFFER_SECONDS = 4 * 60 + 59

/** Deterministic "random" spread so the rain looks messy but renders purely. */
const RAIN = Array.from({ length: 30 }, (_, index) => ({
  isEmoji: index % 3 === 0,
  left: (index * 37 + 11) % 100,
  delay: (index * 173) % 1400,
  duration: 1700 + ((index * 251) % 1300),
  size: 18 + ((index * 7) % 20),
  spin: index % 2 ? 540 : -420,
}))

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const coins = (amount: number) => amount.toLocaleString('en-GB')

const formatClock = (seconds: number) =>
  `00:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A tiny shiny QuivrCoin with a Q on it. Decorative. */
export function QuivrCoin({ className = '' }: { className?: string }) {
  return (
    <span
      className={`pw-coin ${className}`}
      aria-hidden="true"
    >
      <span className="pw-coin__face">Q</span>
    </span>
  )
}

/** Fake checkout for the dating demo. Nothing is ever charged. */
export function Paywall({ reason, wallet, onBuy, onClose }: Props) {
  const [selected, setSelected] = useState<ProductId>(SUGGESTED[reason])
  const [phase, setPhase] = useState<Phase>('shop')
  const [step, setStep] = useState(0)
  const [bought, setBought] = useState<Product>()
  const [offer, setOffer] = useState({ seconds: OFFER_SECONDS, resets: 0 })
  const [line, setLine] = useState(0)
  const [didReset, setDidReset] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const radioName = useId()
  const close = useEffectEvent(onClose)

  const headline = HEADLINES[reason]
  const isQuestions = reason === 'questions'
  const product = PRODUCTS.find(item => item.id === selected) ?? PRODUCTS[0]
  if (!product) throw new Error('No dating demo products are configured')

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])

  useEffect(() => {
    const id = setInterval(
      () =>
        setOffer(({ seconds, resets }) =>
          seconds <= 0
            ? { seconds: OFFER_SECONDS, resets: resets + 1 }
            : { seconds: seconds - 1, resets }
        ),
      1000
    )
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(
      () => setLine(index => (index + 1) % MASCOT_LINES.length),
      MASCOT_MS
    )
    return () => clearInterval(id)
  }, [])

  const complete = (id: ProductId) => {
    onBuy(id)
    setBought(PRODUCTS.find(item => item.id === id))
    setPhase('done')
  }
  const finishCheckout = useEffectEvent(() => complete(selected))

  useEffect(() => {
    if (phase !== 'paying') return
    const ticker = setInterval(
      () => setStep(index => Math.min(index + 1, CHECKOUT_STEPS.length - 1)),
      STEP_MS
    )
    const timer = setTimeout(finishCheckout, STEP_MS * CHECKOUT_STEPS.length)
    return () => {
      clearInterval(ticker)
      clearTimeout(timer)
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'done') doneRef.current?.focus()
  }, [phase])

  const buy = () => {
    if (phase !== 'shop') return
    if (prefersReducedMotion()) return complete(selected)
    setStep(0)
    setPhase('paying')
  }

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const dialog = dialogRef.current
    if (event.key !== 'Tab' || !dialog) return
    const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = items[0]
    const last = items.at(-1)
    if (!first || !last) return
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const resetWallet = () => {
    wallet.reset()
    setDidReset(true)
  }

  return (
    <div
      className="pw-overlay"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {phase === 'done' && (
        <div
          className="pw-rain"
          aria-hidden="true"
        >
          {RAIN.map((drop, index) => (
            <span
              key={index}
              className="pw-rain__drop"
              style={
                {
                  left: `${drop.left}%`,
                  fontSize: `${drop.size}px`,
                  animationDelay: `${drop.delay}ms`,
                  animationDuration: `${drop.duration}ms`,
                  '--pw-spin': `${drop.spin}deg`,
                } as CSSProperties
              }
            >
              {drop.isEmoji ? '🪙' : <QuivrCoin />}
            </span>
          ))}
        </div>
      )}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="pw-sheet"
        onKeyDown={trapFocus}
      >
        <span
          className="pw-burst pw-burst--wow"
          aria-hidden="true"
        >
          <span>💥 WOW</span>
        </span>
        <span
          className="pw-burst pw-burst--limited"
          aria-hidden="true"
        >
          <span>LIMITED!!!</span>
        </span>

        <div className="pw-scroll">
          <button
            type="button"
            className="pw-close"
            onClick={onClose}
            aria-label="Close the Love Shop"
          >
            ✕
          </button>

          {phase === 'done' && bought ? (
            <div className="pw-success">
              <h2
                id={titleId}
                className="pw-chaching"
              >
                CHA-CHING! 🪙
              </h2>
              <p className="pw-owned">
                You now own{' '}
                <strong>
                  {bought.emoji} {bought.title}
                </strong>
                !
              </p>

              <div
                className="pw-printer"
                aria-hidden="true"
              />
              <div className="pw-receipt-slot">
                <div
                  className="pw-receipt"
                  role="group"
                  aria-label="Receipt"
                >
                  <p className="pw-receipt__head">
                    QUIVR LOVE SHOP · RECEIPT #
                    {String(wallet.state.spentCoins).padStart(6, '0')}
                  </p>
                  <dl className="pw-receipt__lines">
                    <dt>
                      {bought.emoji} {bought.title}
                    </dt>
                    <dd>{bought.price}</dd>
                    <dt>Emotional support fee</dt>
                    <dd>0 QuivrCoins</dd>
                    <dt>Cupid’s tip</dt>
                    <dd>1 hug</dd>
                  </dl>
                  <dl className="pw-receipt__lines pw-receipt__total">
                    <dt>Total QuivrCoins spent</dt>
                    <dd>
                      <QuivrCoin className="pw-coin--sm" />{' '}
                      {coins(wallet.state.spentCoins)}
                    </dd>
                    <dt>Real money charged</dt>
                    <dd>€0.00</dd>
                  </dl>
                  <p className="pw-receipt__foot">
                    QuivrCoins are imaginary, like your ex’s promises.
                    <br />
                    Thank you for your imaginary business ✨
                  </p>
                </div>
              </div>

              <button
                ref={doneRef}
                type="button"
                className="pw-buy pw-buy--back"
                onClick={onClose}
              >
                {isQuestions ? 'Back to asking ❓' : 'Back to love 💘'}
              </button>
            </div>
          ) : (
            <>
              <h2
                id={titleId}
                className="pw-title"
              >
                {headline.title}
              </h2>
              <p className="pw-subtitle">{headline.subtitle}</p>

              <div className="pw-mascot-row">
                <div
                  className="pw-mascot"
                  aria-hidden="true"
                >
                  <span className="pw-mascot__heart">💘</span>
                  <span className="pw-mascot__shades">🕶️</span>
                </div>
                <p
                  key={line}
                  className="pw-bubble"
                >
                  {MASCOT_LINES[line]}
                </p>
              </div>

              <p className="pw-countdown">
                <span
                  className="pw-countdown__alarm"
                  aria-hidden="true"
                >
                  ⏰
                </span>
                {offer.resets > 0 ? 'OFFER (STILL) ENDS IN' : 'OFFER ENDS IN'}{' '}
                <span className="pw-countdown__clock">
                  {formatClock(offer.seconds)}
                </span>
              </p>

              <fieldset
                className="pw-products"
                disabled={phase !== 'shop'}
              >
                <legend className="pw-sr">Pick your fake purchase</legend>
                {PRODUCTS.map(item => {
                  const isChecked = item.id === selected
                  const isSuggested = item.id === SUGGESTED[reason]
                  return (
                    <label
                      key={item.id}
                      className={[
                        'pw-product',
                        isChecked && 'pw-product--checked',
                        isSuggested && 'pw-product--suggested',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        type="radio"
                        name={radioName}
                        value={item.id}
                        checked={isChecked}
                        onChange={() => setSelected(item.id)}
                        className="pw-sr"
                      />
                      <span
                        className="pw-product__emoji"
                        aria-hidden="true"
                      >
                        {item.emoji}
                      </span>
                      <span className="pw-product__body">
                        <span className="pw-product__title">{item.title}</span>
                        <span className="pw-product__desc">
                          {item.description}
                        </span>
                      </span>
                      <span className="pw-product__price">
                        {isSuggested && (
                          <s className="pw-was">
                            was {coins(COINS[item.id] * 10 + 9)} QuivrCoins
                          </s>
                        )}
                        <span className="pw-price">
                          <QuivrCoin />
                          {item.price}
                        </span>
                      </span>
                      {item.badge && (
                        <span className="pw-sticker">{item.badge}</span>
                      )}
                      {isSuggested && (
                        <span
                          className="pw-burst pw-burst--pick"
                          aria-hidden="true"
                        >
                          <span>PICK ME!</span>
                        </span>
                      )}
                    </label>
                  )
                })}
              </fieldset>

              <button
                type="button"
                className="pw-buy"
                data-paying={phase === 'paying' || undefined}
                aria-disabled={phase !== 'shop'}
                onClick={buy}
              >
                {phase === 'paying' ? (
                  <>
                    <span
                      className="pw-progress"
                      style={
                        {
                          '--pw-checkout-ms': `${STEP_MS * CHECKOUT_STEPS.length}ms`,
                        } as CSSProperties
                      }
                      aria-hidden="true"
                    />
                    <span
                      key={step}
                      className="pw-buy__step"
                    >
                      {CHECKOUT_STEPS[step]}
                    </span>
                  </>
                ) : (
                  <span className="pw-buy__label">
                    BUY NOW <QuivrCoin className="pw-coin--lg" />{' '}
                    {product.price}
                  </span>
                )}
              </button>
              <p
                className="pw-sr"
                aria-live="polite"
              >
                {phase === 'paying' ? CHECKOUT_STEPS[step] : ''}
              </p>

              <button
                type="button"
                className="pw-link pw-decline"
                onClick={onClose}
              >
                {isQuestions
                  ? 'No thanks, I’ll wonder in silence 🥀'
                  : 'No thanks, I’ll die alone 🥀'}
              </button>
            </>
          )}

          <p className="pw-smallprint">
            Demo parody: no real payments, no card needed, nothing is charged.
            QuivrCoins are fake and worth exactly nothing.
          </p>
          <button
            type="button"
            className="pw-link pw-reset"
            onClick={resetWallet}
          >
            {didReset ? 'Wallet reset ✨ fresh start!' : 'Reset demo wallet'}
          </button>
        </div>
      </div>
    </div>
  )
}
