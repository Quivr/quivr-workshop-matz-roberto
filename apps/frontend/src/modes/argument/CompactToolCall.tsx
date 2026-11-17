import { ToolCallCard } from '../../cards/ToolCallCard'

const ERROR_PREFIX = 'Error: '

const parseJson = (content: string) => {
  try {
    return JSON.parse(content) as unknown
  } catch {
    return content
  }
}

type Props = {
  toolName: string
  argsJson: string
  resultContent?: string
  durationMs?: number
}

/**
 * A tool call as a one-line chip that opens to the raw result. The full cards
 * are too tall for a third of the screen and would bury the argument; the raw
 * result stays one click away, so the facts can be checked.
 */
export function CompactToolCall({
  toolName,
  argsJson,
  resultContent,
  durationMs,
}: Props) {
  const isError = resultContent?.startsWith(ERROR_PREFIX) ?? false
  return (
    <div className="motion-safe:animate-fade-up">
      <ToolCallCard
        toolName={toolName}
        args={parseJson(argsJson || '{}')}
        result={
          resultContent === undefined || isError
            ? undefined
            : parseJson(resultContent)
        }
        error={isError ? resultContent!.slice(ERROR_PREFIX.length) : undefined}
        isPending={resultContent === undefined}
        durationMs={durationMs}
      />
    </div>
  )
}
