import type { Message } from '@ag-ui/core'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { useAgentChat } from '../../useAgentChat'
import { createBarLife } from './barLife'
import { createBreakController } from './breakController'
import { fetchBarFacts } from './factsFetch'
import {
  BREAK_END_LINE,
  RESPONDER_ID,
  SLEEPY_ID_PREFIX,
  sleepyReply,
} from './script'

/** Scripted messages, anchored after the first `at` agent messages. */
type LocalEntry = { at: number; messages: Message[] }

const say = (content: string, idPrefix = ''): Message => ({
  id: idPrefix + crypto.randomUUID(),
  role: 'assistant',
  content,
})

/**
 * The agent chat, plus the break, the soda gag, the schedule banter and the
 * scripted messages. `factsModel` runs the one background lookup.
 */
export function useChillChat(model: string, factsModel?: string) {
  const chat = useAgentChat({ characterId: RESPONDER_ID })
  const [controller] = useState(() => createBreakController())
  const lengthRef = useRef(chat.messages.length)
  const resetChatRef = useRef(chat.reset)
  const [lookupModel] = useState(() => factsModel ?? model)
  const [bar] = useState(() => createBarLife(controller))
  const { gag, banter } = bar
  const breakState = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot
  )
  const gagState = useSyncExternalStore(gag.subscribe, gag.getSnapshot)
  const banterState = useSyncExternalStore(banter.subscribe, banter.getSnapshot)
  const [local, setLocal] = useState<LocalEntry[]>([])
  useEffect(() => {
    lengthRef.current = chat.messages.length
    resetChatRef.current = chat.reset
    bar.setRunning(chat.isRunning)
  })

  const addLocal = useCallback(
    (...messages: Message[]) =>
      setLocal(entries => [...entries, { at: lengthRef.current, messages }]),
    []
  )

  useEffect(() => {
    const stopController = controller.activate()
    const stopGag = gag.activate()
    const stopBanter = banter.activate()
    const stopEvents = controller.onEvent(event => {
      if (event === 'break-start') {
        gag.interrupt()
        banter.interrupt()
      } else addLocal(say(BREAK_END_LINE))
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
      // Leaving the screen aborts any in-flight run.
      resetChatRef.current()
    }
  }, [controller, gag, banter, addLocal, lookupModel, bar])

  const send = (text: string) => {
    banter.interrupt()
    controller.route(text, {
      ask: question => chat.send(question, model),
      sleepy: question => {
        const sleepyCount = local.filter(
          entry => entry.messages[0]?.role === 'user'
        ).length
        addLocal(
          { id: crypto.randomUUID(), role: 'user', content: question },
          say(sleepyReply(sleepyCount), SLEEPY_ID_PREFIX)
        )
      },
    })
  }

  const newChat = () => {
    controller.reset()
    chat.reset()
    setLocal([])
  }

  const messages = chat.messages.flatMap((message, index) => [
    ...local.filter(entry => entry.at === index).flatMap(e => e.messages),
    message,
  ])
  messages.push(
    ...local.filter(e => e.at >= chat.messages.length).flatMap(e => e.messages)
  )

  return {
    ...chat,
    messages,
    send,
    newChat,
    breakState,
    gagState,
    banterState,
  }
}
