import { HttpAgent } from '@ag-ui/client'

import { parseBarFacts, type BarFacts } from './facts'

const PROMPT = `Background lookup for the bar scene. Nobody is chatting: do not write an answer.
Use your tools and use real data only:
1. get_my_schedule from today through the next 6 days (one call).
2. get_classmates for today, but only if that tool exists.
3. list_restaurants, then get_menu for one restaurant for today.
Make those calls, then reply with the single word OK.`

/**
 * One agent run, once per visit, to read the student's schedule (and friends,
 * and one menu) through the usual tools. Only the tool results are used: what
 * the model writes is thrown away, so nothing it says can reach the bar.
 * Aborting `signal` cancels the run.
 */
export async function fetchBarFacts(
  model: string | undefined,
  signal: AbortSignal
): Promise<BarFacts> {
  const agent = new HttpAgent({ url: '/api/agent' })
  signal.addEventListener('abort', () => agent.abortRun(), { once: true })
  agent.addMessage({
    id: crypto.randomUUID(),
    role: 'user',
    content: PROMPT,
  })
  await agent.runAgent({ forwardedProps: { model } })
  return parseBarFacts(agent.messages)
}
