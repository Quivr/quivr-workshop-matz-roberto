import { HttpAgent, type AgentSubscriber } from '@ag-ui/client'
import type { Message, UserMessage } from '@ag-ui/core'
import { useEffect, useRef, useState } from 'react'

import { getCharacter } from '../../characters/registry'
import {
  buildInput,
  dropIncomplete,
  replyInstruction,
  spokenText,
  turnInstruction,
  type ThreadItem,
  type Topic,
} from './messages'
import {
  argumentReducer,
  initialState,
  MAX_TURNS,
  speakerForTurn,
  type ArgumentAction,
} from './turns'

const TOOL_TIMING_EVENT = 'tool_timing'

const nameOf = (id: string) => getCharacter(id)?.name ?? id

type Live = { speaker: string; messages: Message[] }

type TurnResult = { failure: string | null; text: string }

/**
 * One shared thread, three characters. The reducer in turns.ts decides whose
 * turn it is; every turn is one run of a fresh agent that is given the whole
 * thread, so every character sees the same transcript. The run's own messages
 * join the thread when it ends. Every run is aborted on stop, on a student
 * message and on unmount.
 */
export const useArgument = (cast: readonly string[], model: string) => {
  const [state, setState] = useState(() => initialState(cast))
  const [thread, setThread] = useState<ThreadItem[]>([])
  const [live, setLive] = useState<Live | null>(null)
  const [durations, setDurations] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const stateRef = useRef(state)
  const threadRef = useRef<ThreadItem[]>([])
  const agentRef = useRef<HttpAgent | null>(null)
  const inflightRef = useRef<Promise<unknown>>(Promise.resolve())
  const isRunningRef = useRef(false)
  const topicRef = useRef<Topic | null>(null)
  const repliesRef = useRef(0)
  // Bumped on every stop: a loop or a run from an older generation gives up.
  const generationRef = useRef(0)
  const modelRef = useRef(model)
  useEffect(() => {
    modelRef.current = model
  })

  const dispatch = (action: ArgumentAction) => {
    stateRef.current = argumentReducer(stateRef.current, action)
    setState(stateRef.current)
  }

  const commit = (items: ThreadItem[]) => {
    threadRef.current = [...threadRef.current, ...items]
    setThread(threadRef.current)
  }

  /** One run of one character, given the whole thread. */
  const runTurn = (
    speaker: string,
    instruction: UserMessage
  ): Promise<TurnResult> => {
    const generation = generationRef.current
    const input = buildInput(
      topicRef.current!,
      threadRef.current,
      speaker,
      nameOf,
      instruction
    )
    const agent = new HttpAgent({
      url: '/api/agent',
      initialMessages: input,
    })
    agentRef.current = agent
    isRunningRef.current = true
    setError(null)
    setLive({ speaker, messages: [] })

    let failure: string | null = null
    const subscriber: AgentSubscriber = {
      onRunErrorEvent: ({ event }) => {
        failure = event.message
      },
      onMessagesChanged: ({ messages }) =>
        setLive({ speaker, messages: messages.slice(input.length) }),
      onCustomEvent: ({ event }) => {
        if (event.name !== TOOL_TIMING_EVENT) return
        const { toolCallId, durationMs } = event.value as {
          toolCallId: string
          durationMs: number
        }
        setDurations(previous => ({ ...previous, [toolCallId]: durationMs }))
      },
    }

    const run = (async (): Promise<TurnResult> => {
      try {
        await agent.runAgent(
          { forwardedProps: { model: modelRef.current, characterId: speaker } },
          subscriber
        )
      } catch (caught) {
        failure = caught instanceof Error ? caught.message : String(caught)
      }
      // Aborted half way: a tool call without a result would break the next run.
      const fresh = dropIncomplete(agent.messages.slice(input.length))
      commit(fresh.map(message => ({ message, speaker })))
      isRunningRef.current = false
      setLive(null)
      if (generation !== generationRef.current) failure = null
      else if (failure) setError(failure)
      return { failure, text: spokenText(fresh) }
    })()
    inflightRef.current = run
    return run
  }

  const stopAll = () => {
    generationRef.current += 1
    agentRef.current?.abortRun()
  }

  useEffect(() => stopAll, [])

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
      const previous = threadRef.current.findLast(
        item => item.speaker !== undefined && item.message.role === 'assistant'
      )?.speaker
      const { failure, text } = await runTurn(
        speaker,
        turnInstruction({
          turn: current.turn,
          speakerName: nameOf(speaker),
          otherNames: current.cast.filter(id => id !== speaker).map(nameOf),
          previousSpeakerName: previous ? nameOf(previous) : undefined,
        })
      )
      if (generation !== generationRef.current) return
      if (failure || !text) {
        dispatch({
          type: 'turnFailed',
          error: failure ?? 'Nobody said anything.',
        })
        return
      }
      dispatch({ type: 'turnFinished' })
    }
    dispatch({ type: 'stop' })
  }

  const stop = () => {
    dispatch({ type: 'stop' })
    stopAll()
  }

  /** The student writes into the thread: the argument stops and one character answers. */
  const sendStudent = async (text: string) => {
    const status = stateRef.current.status
    if (status === 'idle') return
    if (status === 'running') {
      dispatch({ type: 'studentMessage' })
      stopAll()
    } else if (isRunningRef.current) {
      return
    }
    await inflightRef.current
    commit([
      { message: { id: crypto.randomUUID(), role: 'user', content: text } },
    ])
    // Whoever had the floor answers; later messages go round the cast.
    const speaker = speakerForTurn(
      stateRef.current.cast,
      stateRef.current.turn + repliesRef.current++
    )!
    await runTurn(speaker, replyInstruction(nameOf(speaker)))
  }

  return {
    state,
    thread,
    live,
    durations,
    error,
    isRunning: live !== null,
    start,
    stop,
    sendStudent,
  }
}
