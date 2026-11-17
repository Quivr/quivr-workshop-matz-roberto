import { cards, errorCards, liveCards } from './registry'
import { ToolCallCard } from './ToolCallCard'
import type { CardProps } from './types'

const ERROR_PREFIX = 'Error: '

const parse = (
  content: string | undefined
): Pick<CardProps, 'result' | 'error'> => {
  if (content === undefined) return { result: undefined }
  if (content.startsWith(ERROR_PREFIX)) {
    return { result: undefined, error: content.slice(ERROR_PREFIX.length) }
  }
  try {
    return { result: JSON.parse(content) as unknown }
  } catch {
    return { result: content }
  }
}

type Props = {
  toolName: string
  argsJson: string
  resultContent?: string
  durationMs?: number
  onAction?: (text: string) => void
  onCompose?: (text: string) => void
  actionsDisabled?: boolean
}

/** Picks the registered card for a tool call, or the generic fallback. */
export function ToolCard({
  toolName,
  argsJson,
  resultContent,
  durationMs,
  onAction,
  onCompose,
  actionsDisabled,
}: Props) {
  const props: CardProps = {
    toolName,
    args: parse(argsJson).result,
    ...parse(resultContent),
    isPending: resultContent === undefined,
    durationMs,
    onAction,
    onCompose,
    actionsDisabled,
  }
  const Custom = cards[toolName]

  return (
    <div className="motion-safe:animate-lift space-y-1">
      {Custom &&
        (!props.error || errorCards.has(toolName)) &&
        (!props.isPending || liveCards.has(toolName)) && <Custom {...props} />}
      <ToolCallCard {...props} />
    </div>
  )
}
