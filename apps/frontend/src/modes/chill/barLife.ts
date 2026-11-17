import { buildExchanges } from './banter'
import { createBanter } from './banterScheduler'
import type { BreakController } from './breakController'
import { NO_FACTS, type BarFacts } from './facts'
import { createSodaGag } from './sodaGag'

/**
 * The bar's own life: the soda gag and the schedule banter. They share one
 * rule, one ambient thing at a time, and both stand down while Gus is on
 * break, while the student waits for an answer, and while the tab is hidden.
 */
export function createBarLife(
  controller: BreakController,
  isHidden: () => boolean = () => document.hidden,
  /** True while something else holds the floor (an argument): both stand down. */
  isBusy: () => boolean = () => false
) {
  let isRunning = false
  let facts: BarFacts = NO_FACTS

  const isQuiet = () =>
    !isHidden() && !isBusy() && controller.getSnapshot().phase !== 'break'

  const gag = createSodaGag({
    canPlay: () => isQuiet() && banter.getSnapshot().line === null,
  })
  const banter = createBanter({
    source: () => buildExchanges(facts),
    canPlay: () => {
      const { line, pip } = gag.getSnapshot()
      return isQuiet() && !isRunning && line === null && pip === 'here'
    },
  })

  return {
    gag,
    banter,
    /** True while the student's own question is being answered. */
    setRunning(value: boolean) {
      isRunning = value
    },
    /** The result of the one background lookup. */
    setFacts(value: BarFacts) {
      facts = value
    },
  }
}

export type BarLife = ReturnType<typeof createBarLife>
