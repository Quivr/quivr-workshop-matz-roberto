import { HttpAgent, type AgentSubscriber } from '@ag-ui/client'
import type { Message, UserMessage } from '@ag-ui/core'
import { useEffect, useRef, useState } from 'react'

import { getCharacter } from '../../characters/registry'
import {
  buildInput,
  CHAT_TOPIC,
  dropIncomplete,
  replyInstruction,
  spokenText,
  turnInstruction,
  type ThreadItem,
  type Topic,
} from './messages'
import {
  argumentReducer,
  firstPresent,
  initialState,
  MAX_TURNS,
  type ArgumentAction,
} from './turns'

const TOOL_TIMING_EVENT = 'tool_timing'

const nameOf = (id: string) => getCharacter(id)?.name ?? id

type Live = { speaker: string; messages: Message[] }

type TurnResult = { failure: string | null; text: string }

export type ArgumentOptions = {
  /** True for a character who has stepped out (on a break). Read again before every turn. */
  isAway?: (id: string) => boolean
  /** Answers the student whenever present, instead of the cast taking turns. */
  answerer?: string
  /** Lets the student write before any argument has started. */
  canChatFirst?: boolean
}

/**
 * One shared thread, three characters. The reducer in turns.ts decides whose
 * turn it is; every turn is one run of a fresh agent that is given the whole
 * thread, so every character sees the same transcript. The run's own messages
 * join the thread when it ends. Every run is aborted on stop, on a student
 * message and on unmount. A character who is away is skipped in the turn
 * order (the reducer never counts a skipped turn, so the cap holds) and
 * comes back into it when he is no longer away.
 */
export const useArgument = (
  cast: readonly string[],
  model: string,
  options: ArgumentOptions = {}
) => {
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
  // Bumped by newArgument: a run from an older argument must not touch the new thread.
  const epochRef = useRef(0)
  const modelRef = useRef(model)
  const optionsRef = useRef(options)
  useEffect(() => {
    modelRef.current = model
    optionsRef.current = options
  })

  const awayNow = () => {
    const isAway = optionsRef.current.isAway
    return isAway ? cast.filter(isAway) : []
  }

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
    const epoch = epochRef.current
    const input = buildInput(
      topicRef.current ?? CHAT_TOPIC,
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
      if (epoch !== epochRef.current) return { failure: null, text: '' }
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
    if (stateRef.current.status !== 'idle' || isRunningRef.current) return
    topicRef.current = topic
    const generation = generationRef.current
    dispatch({ type: 'start', topic: topic.label, away: awayNow() })

    // The reducer ends the argument at MAX_TURNS; this bound is a second guard.
    for (let i = 0; i < MAX_TURNS; i++) {
      const current = stateRef.current
      if (current.status !== 'running' || current.speaker === null) return
      if (generation !== generationRef.current) return

      const speaker = current.speaker
      const away = awayNow()
      const previous = threadRef.current.findLast(
        item => item.speaker !== undefined && item.message.role === 'assistant'
      )?.speaker
      const { failure, text } = await runTurn(
        speaker,
        turnInstruction({
          turn: current.turn,
          speakerName: nameOf(speaker),
          otherNames: current.cast
            .filter(id => id !== speaker && !away.includes(id))
            .map(nameOf),
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
      dispatch({ type: 'turnFinished', away: awayNow() })
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
    if (status === 'idle' && !optionsRef.current.canChatFirst) return
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
    // Whoever had the floor answers; later messages go round the cast (the
    // answerer, when there is one and he is here, takes all of them).
    const away = awayNow()
    const { answerer } = optionsRef.current
    const speaker =
      answerer !== undefined && !away.includes(answerer)
        ? answerer
        : firstPresent(
            stateRef.current.cast,
            stateRef.current.turn + repliesRef.current++,
            away
          )
    if (speaker === null) return
    await runTurn(speaker, replyInstruction(nameOf(speaker)))
  }

  /** Back to an empty table: aborts any run, forgets the thread and the topic. */
  const newArgument = () => {
    epochRef.current += 1
    stopAll()
    isRunningRef.current = false
    inflightRef.current = Promise.resolve()
    topicRef.current = null
    repliesRef.current = 0
    threadRef.current = []
    stateRef.current = initialState(cast)
    setState(stateRef.current)
    setThread([])
    setLive(null)
    setDurations({})
    setError(null)
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
    newArgument,
  }
}
