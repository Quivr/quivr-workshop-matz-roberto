import { createContext, useContext } from 'react'

type ChatActions = {
  /** Sends a message as if the student typed it. Ignored while the agent is busy. */
  send: (text: string) => void
  canSend: boolean
}

export const ChatActionsContext = createContext<ChatActions>({
  send: () => undefined,
  canSend: false,
})

/** Lets a card send a follow-up message, e.g. from a button or a swipe. */
export const useChatActions = () => useContext(ChatActionsContext)
