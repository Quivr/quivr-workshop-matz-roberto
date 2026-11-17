import { RunAgentInputSchema } from '@ag-ui/core/schemas'
import { EventEncoder } from '@ag-ui/encoder'
import { Controller, Get, Post, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'

import { toAgUiEvents } from './ag-ui.js'
import { config } from './config.js'
import { toModelMessages } from './messages.js'
import { isCharacterId } from './personas.js'
import { runAgent } from './run-agent.js'
import { readTraces } from './traces.js'

@Controller()
export class AgentController {
  /** AG-UI endpoint: takes a RunAgentInput, streams AG-UI events over SSE. */
  @Post('agent')
  async run(@Req() req: Request, @Res() res: Response) {
    const parsed = RunAgentInputSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message })
      return
    }
    const input = parsed.data
    const props = (input.forwardedProps ?? {}) as {
      model?: string
      characterId?: unknown
    }

    const abort = new AbortController()
    res.on('close', () => abort.abort())

    const encoder = new EventEncoder({ accept: req.headers.accept })
    res.status(200).set({
      'content-type': encoder.getContentType(),
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    res.flushHeaders()

    const parts = runAgent({
      messages: toModelMessages(input.messages),
      model: props.model,
      characterId: isCharacterId(props.characterId)
        ? props.characterId
        : undefined,
      abortSignal: abort.signal,
    })
    const ids = { threadId: input.threadId, runId: input.runId }
    for await (const event of toAgUiEvents(parts, ids)) {
      res.write(encoder.encode(event))
    }
    res.end()
  }

  @Get('models')
  models() {
    return { models: config.allowedModels, defaultModel: config.defaultModel }
  }

  @Get('traces')
  traces() {
    return { traces: readTraces() }
  }
}
