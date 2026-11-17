import { DemoBadge } from '../cards/DemoBadge'
import { canAskUnlimited, useWallet } from '../wallet'

/** One line above the composer: free questions left, or the fake Quivr SaaS™ status. */
export function QuestionStatus() {
  const wallet = useWallet()
  const { questions } = wallet.state
  const unlimited = canAskUnlimited(wallet.state)

  const label = unlimited
    ? wallet.state.plus
      ? 'Quivr SaaS™: unlimited questions ♾️'
      : 'Unlimited questions ♾️'
    : questions > 0
      ? `${questions} free ${questions === 1 ? 'question' : 'questions'} left`
      : 'No free questions left'

  return (
    <div className="text-muted mb-2 flex items-center gap-2 text-xs">
      <span>{label}</span>
      <DemoBadge note="Fake subscription for the demo: nothing is ever charged." />
      {!unlimited && (
        <button
          type="button"
          onClick={() => wallet.openPaywall('questions')}
          className="text-muted hover:text-heading ml-auto underline"
        >
          Get Quivr SaaS™
        </button>
      )}
    </div>
  )
}
