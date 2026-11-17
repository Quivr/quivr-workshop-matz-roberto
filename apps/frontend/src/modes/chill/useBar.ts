import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { createBarLife } from './barLife'
import { createBreakController } from './breakController'
import { fetchBarFacts } from './factsFetch'

type Options = {
  model: string
  /** Model for the one background lookup; defaults to `model`. */
  factsModel?: string
  onBreakStart?: () => void
  onBreakEnd?: () => void
}

/**
 * The bar around a chat: the break controller, the soda gag, the schedule
 * banter and the one background lookup per visit. Everything is activated on
 * mount and stopped on unmount, and the lookup is aborted with it. The caller
 * routes the student's messages through `controller.route`.
 */
export function useBar({
  model,
  factsModel,
  onBreakStart,
  onBreakEnd,
}: Options) {
  const [controller] = useState(() => createBreakController())
  const [lookupModel] = useState(() => factsModel ?? model)
  const [bar] = useState(() => createBarLife(controller))
  const { gag, banter } = bar
  const handlersRef = useRef({ onBreakStart, onBreakEnd })
  useEffect(() => {
    handlersRef.current = { onBreakStart, onBreakEnd }
  })
  const breakState = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot
  )
  const gagState = useSyncExternalStore(gag.subscribe, gag.getSnapshot)
  const banterState = useSyncExternalStore(banter.subscribe, banter.getSnapshot)

  useEffect(() => {
    const stopController = controller.activate()
    const stopGag = gag.activate()
    const stopBanter = banter.activate()
    const stopEvents = controller.onEvent(event => {
      if (event === 'break-start') {
        gag.interrupt()
        banter.interrupt()
        handlersRef.current.onBreakStart?.()
      } else handlersRef.current.onBreakEnd?.()
    })
    // One lookup per visit. The short delay lets a StrictMode remount cancel
    // the first one before anything is sent.
    const lookup = new AbortController()
    const lookupTimer = setTimeout(() => {
      fetchBarFacts(lookupModel || undefined, lookup.signal)
        .then(facts => {
          if (!lookup.signal.aborted) bar.setFacts(facts)
        })
        .catch(() => {})
    }, 300)
    return () => {
      clearTimeout(lookupTimer)
      lookup.abort()
      stopEvents()
      stopBanter()
      stopGag()
      stopController()
    }
  }, [controller, gag, banter, lookupModel, bar])

  return { controller, bar, breakState, gagState, banterState }
}
