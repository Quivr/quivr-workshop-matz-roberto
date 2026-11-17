/**
 * Runs `send` only when `spendQuestion` lets the question through. A blocked
 * question never reaches the agent: no LLM call, no tool calls.
 */
export const askThroughGate = (
  spendQuestion: () => boolean,
  send: () => void
): boolean => {
  if (!spendQuestion()) return false
  send()
  return true
}
