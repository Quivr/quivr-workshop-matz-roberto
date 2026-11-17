import { HttpAgent, type AgentSubscriber } from '@ag-ui/client'
import type { Message } from '@ag-ui/core'
import { useCallback, useRef, useState } from 'react'

const TOOL_TIMING_EVENT = 'tool_timing'

const newAgent = () => new HttpAgent({ url: '/api/agent' })

export type UseAgentChatOptions = {
  model?: string
  characterId?: string
}

/**
 * An aborted run can leave an assistant message whose tool calls never got a
 * result. The model API rejects that history, so drop the orphaned calls.
 */
const dropOrphanToolCalls = (messages: Message[]): Message[] => {
  const answered = new Set(
    messages.flatMap(message =>
      message.role === 'tool' ? [message.toolCallId] : []
    )
  )
  return messages.flatMap(message => {
    if (message.role !== 'assistant' || !message.toolCalls?.length)
      return [message]
    const toolCalls = message.toolCalls.filter(call => answered.has(call.id))
    if (toolCalls.length === message.toolCalls.length) return [message]
    if (toolCalls.length === 0 && !message.content) return []
    return [{ ...message, toolCalls }]
  })
}

/** Chat state on top of an AG-UI HttpAgent. Memory only: "new chat" forgets everything. */
export const useAgentChat = (options: UseAgentChatOptions = {}) => {
  const agentRef = useRef(newAgent())
  // Bumped whenever a run is started or cancelled: callbacks of a run that is
  // no longer the current one must not touch state (or show an error).
  const runIdRef = useRef(0)
  const isRunningRef = useRef(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [durations, setDurations] = useState<Record<string, number>>({})

  const send = async (text: string, model?: string) => {
    const agent = agentRef.current
    const runId = ++runIdRef.current
    const isCurrent = () => runIdRef.current === runId

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
    isRunningRef.current = true
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
      if (isCurrent()) {
        isRunningRef.current = false
        setIsRunning(false)
      }
    }
  }

  /** Cancels the in-flight run and keeps the conversation. No-op when idle. */
  const abort = useCallback(() => {
    if (!isRunningRef.current) return
    const agent = agentRef.current
    runIdRef.current++
    isRunningRef.current = false
    agent.abortRun()
    agent.setMessages(dropOrphanToolCalls(agent.messages))
    setMessages([...agent.messages])
    setIsRunning(false)
  }, [])

  const reset = () => {
    runIdRef.current++
    isRunningRef.current = false
    agentRef.current.abortRun()
    agentRef.current = newAgent()
    setMessages([])
    setDurations({})
    setError(null)
    setIsRunning(false)
  }

  return { messages, isRunning, error, durations, send, abort, reset }
}
