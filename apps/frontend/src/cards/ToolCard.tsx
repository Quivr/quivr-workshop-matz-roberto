import { cards } from './registry'
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
}

/** Picks the registered card for a tool call, or the generic fallback. */
export function ToolCard({
  toolName,
  argsJson,
  resultContent,
  durationMs,
}: Props) {
  const props: CardProps = {
    toolName,
    args: parse(argsJson).result,
    ...parse(resultContent),
    isPending: resultContent === undefined,
    durationMs,
  }
  const Custom = cards[toolName]

  return (
    <div className="motion-safe:animate-fade-up space-y-1">
      {Custom && !props.isPending && !props.error && (
        <div className="motion-safe:animate-fade-up">
          <Custom {...props} />
        </div>
      )}
      <ToolCallCard {...props} />
    </div>
  )
}
