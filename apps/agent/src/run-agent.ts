import { createMCPClient } from '@ai-sdk/mcp'
import {
  isStepCount,
  streamText,
  type ModelMessage,
  type TextStreamPart,
  type ToolSet,
} from 'ai'

import { now } from './clock.js'
import { config } from './config.js'
import { resolveModel } from './models.js'
import { buildInstructions } from './prompt.js'
import { startTrace } from './traces.js'

export type RunAgentOptions = {
  messages: ModelMessage[]
  model?: string
  /** Persona id (see personas.ts). Unknown or missing means the neutral prompt. */
  characterId?: string
  /** Overrides the clock, e.g. in evals. */
  now?: Date
  mcpUrl?: string
  abortSignal?: AbortSignal
}

export type AgentStreamPart = TextStreamPart<ToolSet>

const withTimeout = (tools: ToolSet, timeoutMs: number): ToolSet =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...tool,
        execute: (input: unknown, options: { abortSignal?: AbortSignal }) => {
          const timeout = AbortSignal.timeout(timeoutMs)
          const abortSignal = options.abortSignal
            ? AbortSignal.any([options.abortSignal, timeout])
            : timeout
          return tool.execute?.(input, { ...options, abortSignal } as never)
        },
      },
    ])
  ) as ToolSet

/**
 * The agent: one LLM loop with the tools from the MCP server.
 * Used by the HTTP endpoint and by the evals.
 */
export async function* runAgent(
  options: RunAgentOptions
): AsyncGenerator<AgentStreamPart> {
  const { id, model } = resolveModel(options.model)
  const trace = startTrace(id, options.messages)
  let mcp: Awaited<ReturnType<typeof createMCPClient>> | undefined
  let failure: unknown

  try {
    mcp = await createMCPClient({
      transport: { type: 'http', url: options.mcpUrl ?? config.mcpUrl },
    })
    const tools = withTimeout(await mcp.tools(), config.toolTimeoutMs)

    const result = streamText({
      model,
      instructions: buildInstructions(
        options.now ?? now(),
        options.characterId
      ),
      messages: options.messages,
      tools,
      stopWhen: isStepCount(config.maxSteps),
      abortSignal: options.abortSignal,
      onError: () => {},
    })

    for await (const part of result.stream) {
      trace.record(part)
      yield part
    }
  } catch (error) {
    failure = error
    throw error
  } finally {
    trace.finish(failure)
    await mcp?.close()
  }
}
