import { ToolCard } from '../../cards/ToolCard'
import type { ToolCallRow } from './rows'

const ERROR_PREFIX = 'Error: '

const summary = (calls: ToolCallRow[]) => {
  const counts = new Map<string, number>()
  for (const call of calls) {
    counts.set(call.name, (counts.get(call.name) ?? 0) + 1)
  }
  return [...counts]
    .map(([name, count]) => (count > 1 ? `${name} ×${count}` : name))
    .join(', ')
}

const statusOf = (calls: ToolCallRow[]) => {
  const pending = calls.filter(call => call.resultContent === undefined).length
  if (pending) return `${pending} running…`
  const failed = calls.some(call =>
    call.resultContent?.startsWith(ERROR_PREFIX)
  )
  return failed ? 'failed' : 'done'
}

type Props = {
  calls: ToolCallRow[]
  durations: Record<string, number>
}

/**
 * A character's tool calls, folded into one line. The cards are too tall for
 * the middle of an argument (one library card fills the screen, ten menus are
 * a wall), so they open on demand, with the raw result under each so the
 * facts can be checked.
 */
export function ToolGroup({ calls, durations }: Props) {
  const title =
    calls.length === 1 ? calls[0]!.name : `${calls.length} tool calls`
  return (
    <details className="border-schedule-border-grey bg-surface motion-safe:animate-fade-up rounded-md border text-xs">
      <summary className="hover:bg-schedule-bg-grey cursor-pointer rounded-md px-3 py-2 motion-safe:transition-colors">
        <span className="font-bold">🔧 {title}</span>
        <span className="text-muted">
          {' '}
          {calls.length > 1 && `${summary(calls)} · `}
          {statusOf(calls)}
        </span>
      </summary>
      <div className="border-schedule-border-grey space-y-2 border-t p-2">
        {calls.map(call => (
          <ToolCard
            key={call.id}
            toolName={call.name}
            argsJson={call.argsJson}
            resultContent={call.resultContent}
            durationMs={durations[call.id]}
          />
        ))}
      </div>
    </details>
  )
}
