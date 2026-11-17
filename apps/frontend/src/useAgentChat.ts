import { HttpAgent, type AgentSubscriber } from '@ag-ui/client'
import type { Message } from '@ag-ui/core'
import { useCallback, useRef, useState } from 'react'

import { createRunTracker, dropOrphanToolCalls } from './chatRun'

const TOOL_TIMING_EVENT = 'tool_timing'

const newAgent = () => new HttpAgent({ url: '/api/agent' })

export type UseAgentChatOptions = {
  model?: string
  characterId?: string
}

/** Chat state on top of an AG-UI HttpAgent. Memory only: "new chat" forgets everything. */
export const useAgentChat = (options: UseAgentChatOptions = {}) => {
  const agentRef = useRef(newAgent())
  const runsRef = useRef(createRunTracker())
  const [messages, setMessages] = useState<Message[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [durations, setDurations] = useState<Record<string, number>>({})

  const send = async (text: string, model?: string) => {
    const agent = agentRef.current
    const { isCurrent, finish } = runsRef.current.start()

    const subscriber: AgentSubscriber = {
      onMessagesChanged: ({ messages }) => {
        if (isCurrent()) setMessages([...messages])
      },
      onCustomEvent: ({ event }) => {
        if (!isCurrent() || event.name !== TOOL_TIMING_EVENT) return
        const { toolCallId, durationMs } = event.value as {
          toolCallId: string
          durationMs: number
        }
        setDurations(previous => ({ ...previous, [toolCallId]: durationMs }))
      },
      onRunErrorEvent: ({ event }) => {
        if (isCurrent()) setError(event.message)
      },
      onRunFailed: ({ error }) => {
        if (isCurrent()) setError(error.message)
      },
    }

    agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text })
    setMessages([...agent.messages])
    setError(null)
    setIsRunning(true)
    try {
      const { model: defaultModel, characterId } = options
      await agent.runAgent(
        { forwardedProps: { model: model ?? defaultModel, characterId } },
        subscriber
      )
    } catch (runError) {
      if (isCurrent())
        setError(
          runError instanceof Error ? runError.message : String(runError)
        )
    } finally {
      if (finish()) setIsRunning(false)
    }
  }

  /** Cancels the in-flight run and keeps the conversation. No-op when idle. */
  const abort = useCallback(() => {
    if (!runsRef.current.cancel()) return
    const agent = agentRef.current
    agent.abortRun()
    agent.setMessages(dropOrphanToolCalls(agent.messages))
    setMessages([...agent.messages])
    setIsRunning(false)
  }, [])

  const reset = () => {
    runsRef.current.invalidate()
    agentRef.current.abortRun()
    agentRef.current = newAgent()
    setMessages([])
    setDurations({})
    setError(null)
    setIsRunning(false)
  }

  return { messages, isRunning, error, durations, send, abort, reset }
}
