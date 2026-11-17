import type { Message } from '@ag-ui/core'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAgentChat } from '../../useAgentChat'
import {
  BREAK_END_LINE,
  RESPONDER_ID,
  SLEEPY_ID_PREFIX,
  sleepyReply,
} from './script'
import { useBar } from './useBar'

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
  const lengthRef = useRef(chat.messages.length)
  const resetChatRef = useRef(chat.reset)
  const [local, setLocal] = useState<LocalEntry[]>([])
  const addLocal = useCallback(
    (...messages: Message[]) =>
      setLocal(entries => [...entries, { at: lengthRef.current, messages }]),
    []
  )
  const { controller, bar, breakState, gagState, banterState } = useBar({
    model,
    factsModel,
    onBreakEnd: () => addLocal(say(BREAK_END_LINE)),
  })
  const { banter } = bar
  useEffect(() => {
    lengthRef.current = chat.messages.length
    resetChatRef.current = chat.reset
    bar.setRunning(chat.isRunning)
  })
  // Leaving the screen aborts any in-flight run.
  useEffect(() => () => resetChatRef.current(), [])

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
