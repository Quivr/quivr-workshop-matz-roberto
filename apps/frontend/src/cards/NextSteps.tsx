import { useWallet } from '../wallet'
import { useChatActions } from './chat-actions'

export type NextStep = {
  /** Short button text, e.g. '🍝 Lunch' */
  label: string
  /** The message sent as if the student typed it. */
  message: string
}

/** Tappable quick replies under a card. Disabled while the agent is busy. */
export function NextSteps({
  steps,
  title = 'Next step',
}: {
  steps: NextStep[]
  title?: string
}) {
  const { send, canSend } = useChatActions()
  const wallet = useWallet()
  if (!steps.length) return null
  const isLocked = !wallet.isUnlimited && wallet.state.actions <= 0

  return (
    <div
      role="group"
      aria-label={title}
      className="flex flex-wrap items-center gap-1.5 pt-2"
    >
      <span className="text-main-text mr-1 text-[10px] font-bold tracking-widest uppercase">
        {title}
      </span>
      {!wallet.isUnlimited && (
        <span
          className="text-love-text text-[10px] font-bold"
          title="Free options left. Each tap uses one."
        >
          {isLocked ? '🔒 0 free' : `🎟 ${wallet.state.actions} free`}
        </span>
      )}
      {steps.map((step, index) => (
        <button
          key={`${step.label}-${index}`}
          type="button"
          disabled={!canSend}
          onClick={() => send(step.message)}
          title={step.message}
          style={{ animationDelay: `${index * 60}ms` }}
          className="motion-safe:animate-fade-up bg-surface text-love-text ring-love/30 hover:bg-love-wash rounded-full px-3 py-1 text-xs font-semibold shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isLocked && <span aria-label="locked">🔒 </span>}
          {step.label}
        </button>
      ))}
    </div>
  )
}
