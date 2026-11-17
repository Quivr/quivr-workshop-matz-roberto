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
import { pause, waitUntilVisible } from './gates'
import {
  argumentReducer,
  firstPresent,
  initialState,
  type ArgumentAction,
} from './turns'

/** The beat of calm after the student's answer, before they start up again. */
export const CALM_MS = 2_500

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
  /** Optional cap on finished turns. Unlimited when left out. */
  maxTurns?: number
  /** How long they stay calm after answering the student. */
  calmMs?: number
}

/**
 * One shared thread, three characters. The reducer in turns.ts decides whose
 * turn it is; every turn is one run of a fresh agent that is given the whole
 * thread, so every character sees the same transcript. The run's own messages
 * join the thread when it ends.
 *
 * There is no turn cap unless `maxTurns` is set, so the only things that end
 * an argument for good are "Stop it!", leaving the screen, a failing turn and
 * too few characters. Everything else is paced: no turn starts while the tab
 * is hidden. A student message is not an end: the runs stop, one character
 * answers, the characters calm down for a beat and the argument goes on from
 * where the turn order was. Every run, wait and timer is aborted on stop, on
 * a student message and on unmount. A character who is away is skipped in
 * the turn order (a skipped turn never counts) and comes back into it when
 * he is no longer away.
 */
export const useArgument = (
  cast: readonly string[],
  model: string,
  options: ArgumentOptions = {}
) => {
  const [state, setState] = useState(() =>
    initialState(cast, options.maxTurns ?? null)
  )
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
  // Aborted on every stop with the generation: ends the waits (hidden tab, calm beat) of the old one.
  const abortRef = useRef(new AbortController())
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
    abortRef.current.abort()
    abortRef.current = new AbortController()
    agentRef.current?.abortRun()
  }

  useEffect(() => stopAll, [])

  /** The turn loop. Ends when the state stops running or a stop makes this generation stale. */
  const argue = async () => {
    const generation = generationRef.current
    const { signal } = abortRef.current
    for (;;) {
      const current = stateRef.current
      if (current.status !== 'running' || current.speaker === null) return
      if (generation !== generationRef.current) return
      // A hidden tab pauses the argument between two turns, and a stop ends the wait.
      if (!(await waitUntilVisible(signal))) return
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
          maxTurns: current.maxTurns,
          resuming: current.resuming,
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
  }

  const start = async (topic: Topic) => {
    if (stateRef.current.status !== 'idle' || isRunningRef.current) return
    topicRef.current = topic
    dispatch({ type: 'start', topic: topic.label, away: awayNow() })
    await argue()
  }

  /** The answer is in: a calm beat, then the argument picks up where the turn order was. */
  const resumeAfterBeat = async (generation: number, signal: AbortSignal) => {
    dispatch({ type: 'answered' })
    if (!(await pause(optionsRef.current.calmMs ?? CALM_MS, signal))) return
    if (generation !== generationRef.current) return
    dispatch({ type: 'resume', away: awayNow() })
    await argue()
  }

  const stop = () => {
    dispatch({ type: 'stop' })
    stopAll()
  }

  /**
   * The student writes into the thread. While the argument runs this is an
   * interruption, not an end: the runs stop, one character answers, and after
   * a calm beat the argument goes on. Anywhere else one character just answers.
   */
  const sendStudent = async (text: string) => {
    const status = stateRef.current.status
    if (status === 'idle' && !optionsRef.current.canChatFirst) return
    if (status === 'running' || status === 'calm') {
      dispatch({ type: 'studentMessage' })
      stopAll()
    } else if (isRunningRef.current) {
      return
    }
    const interrupted = stateRef.current.status === 'answering'
    const generation = generationRef.current
    const { signal } = abortRef.current
    await inflightRef.current
    commit([
      { message: { id: crypto.randomUUID(), role: 'user', content: text } },
    ])
    // "Stop it!" or leaving the screen while the last run wound down: no answer.
    if (generation !== generationRef.current) return
    // Whoever had the floor answers; later messages go round the cast (the
    // answerer, when there is one and he is here, takes all of them).
    const away = awayNow()
    const { answerer } = optionsRef.current
    const { floor, cast: people, turn } = stateRef.current
    const speaker =
      answerer !== undefined && !away.includes(answerer)
        ? answerer
        : interrupted && floor !== null
          ? firstPresent(people, people.indexOf(floor), away)
          : firstPresent(people, turn + repliesRef.current++, away)
    if (speaker !== null) {
      const { failure } = await runTurn(
        speaker,
        replyInstruction(nameOf(speaker))
      )
      if (generation !== generationRef.current) return
      if (interrupted && failure) {
        dispatch({ type: 'turnFailed', error: failure })
        return
      }
    }
    if (interrupted) void resumeAfterBeat(generation, signal)
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
    stateRef.current = initialState(cast, optionsRef.current.maxTurns ?? null)
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
