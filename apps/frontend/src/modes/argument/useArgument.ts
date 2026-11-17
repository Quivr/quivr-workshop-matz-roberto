import { HttpAgent, type AgentSubscriber } from '@ag-ui/client'
import type { Message } from '@ag-ui/core'
import { useEffect, useRef, useState } from 'react'

import { getCharacter } from '../../characters/registry'
import {
  dropIncomplete,
  heardMessage,
  isPrompt,
  spokenText,
  turnPrompt,
  type Topic,
} from './messages'
import {
  argumentReducer,
  initialState,
  MAX_TURNS,
  type ArgumentAction,
} from './turns'

const TOOL_TIMING_EVENT = 'tool_timing'

export type Chat = {
  messages: Message[]
  durations: Record<string, number>
  isRunning: boolean
  error: string | null
}

const emptyChat: Chat = {
  messages: [],
  durations: {},
  isRunning: false,
  error: null,
}

const nameOf = (id: string) => getCharacter(id)?.name ?? id

/**
 * Three agents, one per character, taking turns. The reducer in turns.ts
 * decides whose turn it is; this hook only runs the turn and reports back.
 * Every run is aborted on stop, on a student message and on unmount.
 */
export const useArgument = (cast: readonly string[], model: string) => {
  const [state, setState] = useState(() => initialState(cast))
  const [chats, setChats] = useState<Record<string, Chat>>(() =>
    Object.fromEntries(cast.map(id => [id, emptyChat]))
  )
  const stateRef = useRef(state)
  const agentsRef = useRef<Map<string, HttpAgent>>(new Map())
  const inflightRef = useRef<Map<string, Promise<void>>>(new Map())
  // Bumped on every stop: a loop or a run from an older generation gives up.
  const generationRef = useRef(0)
  const topicRef = useRef<Topic | null>(null)
  const modelRef = useRef(model)
  useEffect(() => {
    modelRef.current = model
  })

  const dispatch = (action: ArgumentAction) => {
    stateRef.current = argumentReducer(stateRef.current, action)
    setState(stateRef.current)
  }

  const patch = (id: string, change: Partial<Chat>) =>
    setChats(previous => ({
      ...previous,
      [id]: { ...(previous[id] ?? emptyChat), ...change },
    }))

  const agentFor = (id: string) => {
    let agent = agentsRef.current.get(id)
    if (!agent) {
      agent = new HttpAgent({ url: '/api/agent' })
      agentsRef.current.set(id, agent)
    }
    return agent
  }

  const sync = (id: string) =>
    patch(id, { messages: [...agentFor(id).messages] })

  const subscriberFor = (
    id: string,
    onError: (message: string) => void
  ): AgentSubscriber => ({
    onRunErrorEvent: ({ event }) => onError(event.message),
    onRunFailed: ({ error }) => onError(error.message),
    onMessagesChanged: ({ messages }) => patch(id, { messages: [...messages] }),
    onCustomEvent: ({ event }) => {
      if (event.name !== TOOL_TIMING_EVENT) return
      const { toolCallId, durationMs } = event.value as {
        toolCallId: string
        durationMs: number
      }
      setChats(previous => {
        const chat = previous[id] ?? emptyChat
        return {
          ...previous,
          [id]: {
            ...chat,
            durations: { ...chat.durations, [toolCallId]: durationMs },
          },
        }
      })
    },
  })

  /** One run of one character's agent. Resolves with an error message, if any. */
  const runOne = (id: string): Promise<string | null> => {
    const generation = generationRef.current
    const agent = agentFor(id)
    patch(id, { isRunning: true, error: null })
    const run = (async () => {
      let failure: string | null = null
      try {
        await agent.runAgent(
          { forwardedProps: { model: modelRef.current, characterId: id } },
          subscriberFor(id, message => {
            failure = message
          })
        )
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error)
      }
      if (generation !== generationRef.current) {
        // Aborted half way: a tool call without a result would break the next run.
        agent.setMessages(dropIncomplete(agent.messages))
        failure = null
      }
      patch(id, {
        isRunning: false,
        messages: [...agent.messages],
        error: failure,
      })
      return failure
    })()
    inflightRef.current.set(
      id,
      run.then(() => undefined)
    )
    return run
  }

  const stopAll = () => {
    generationRef.current += 1
    for (const agent of agentsRef.current.values()) agent.abortRun()
  }

  useEffect(() => stopAll, [])

  /** Gives a character what it has heard since it last spoke. */
  const deliverInbox = (id: string) => {
    const agent = agentFor(id)
    const inbox = stateRef.current.inbox[id] ?? []
    for (const heard of inbox) {
      agent.addMessage(heardMessage(heard, nameOf(heard.from)))
    }
    dispatch({ type: 'delivered', characterId: id })
    return inbox
  }

  const start = async (topic: Topic) => {
    if (stateRef.current.status !== 'idle') return
    topicRef.current = topic
    const generation = generationRef.current
    dispatch({ type: 'start', topic: topic.label })

    // The reducer ends the argument at MAX_TURNS; this bound is a second guard.
    for (let i = 0; i < MAX_TURNS; i++) {
      const current = stateRef.current
      if (current.status !== 'running' || current.speaker === null) return
      if (generation !== generationRef.current) return

      const speaker = current.speaker
      const agent = agentFor(speaker)
      const turnStart = agent.messages.length
      const inbox = deliverInbox(speaker)
      agent.addMessage(
        turnPrompt({
          topic,
          turn: current.turn,
          speakerName: nameOf(speaker),
          otherNames: current.cast.filter(id => id !== speaker).map(nameOf),
          isFirstTurnForSpeaker: !agent.messages.some(isPrompt),
          previousSpeakerName: inbox.length
            ? nameOf(inbox[inbox.length - 1]!.from)
            : undefined,
        })
      )
      sync(speaker)

      const failure = await runOne(speaker)
      if (generation !== generationRef.current) return
      if (failure) {
        dispatch({ type: 'turnFailed', error: failure })
        return
      }
      dispatch({
        type: 'turnFinished',
        text: spokenText(agent.messages, turnStart),
      })
    }
    dispatch({ type: 'stop' })
  }

  const stop = () => {
    dispatch({ type: 'stop' })
    stopAll()
  }

  /** The student types into one chat: the argument stops and that character answers. */
  const sendStudent = async (id: string, text: string) => {
    if (stateRef.current.status === 'idle') return
    if (stateRef.current.status === 'running') {
      dispatch({ type: 'studentMessage' })
      stopAll()
    }
    await inflightRef.current.get(id)
    const agent = agentFor(id)
    deliverInbox(id)
    agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text })
    sync(id)
    await runOne(id)
  }

  return { state, chats, start, stop, sendStudent }
}
