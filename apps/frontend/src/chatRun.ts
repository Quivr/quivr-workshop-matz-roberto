import type { Message } from '@ag-ui/core'

/**
 * An aborted run can leave an assistant message whose tool calls never got a
 * result. The model API rejects that history, so drop the orphaned calls.
 */
export const dropOrphanToolCalls = (messages: Message[]): Message[] => {
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

/**
 * Which run owns the chat state. Callbacks of a run that is no longer the
 * current one (cancelled, or replaced by a newer one) must not touch state or
 * show an error. Leaving the screen does not cancel anything: only `cancel`
 * and `invalidate` do.
 */
export const createRunTracker = () => {
  let current = 0
  let running = false
  return {
    isRunning: () => running,
    start() {
      const id = ++current
      running = true
      return {
        isCurrent: () => current === id,
        /** Marks the run done. Returns false when it was no longer current. */
        finish() {
          if (current !== id) return false
          running = false
          return true
        },
      }
    },
    /** Cancels the in-flight run. Returns false (and does nothing) when idle. */
    cancel() {
      if (!running) return false
      current++
      running = false
      return true
    },
    /** Disowns any run, idle or not. */
    invalidate() {
      current++
      running = false
    },
  }
}
