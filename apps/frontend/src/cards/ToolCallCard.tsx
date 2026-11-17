import type { CardProps } from './types'

const pretty = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2)

const TypingDots = () => (
  <span
    aria-hidden
    className="ml-1 inline-flex gap-0.5 align-middle"
  >
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="bg-sidenav-secondary motion-safe:animate-dot size-1 rounded-full"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </span>
)

/** Fallback card for any tool: name, args, result and duration. */
export function ToolCallCard({
  toolName,
  args,
  result,
  error,
  isPending,
  durationMs,
}: CardProps) {
  const status = isPending ? 'running…' : error ? 'failed' : 'done'
  const duration = durationMs === undefined ? '' : ` · ${durationMs} ms`

  return (
    <details className="border-schedule-border-grey bg-surface rounded-md border text-xs">
      <summary className="hover:bg-schedule-bg-grey cursor-pointer rounded-md px-3 py-2 motion-safe:transition-colors">
        <span className="font-bold">🔧 {toolName}</span>
        <span
          className={`${error ? 'text-danger' : 'text-muted'} motion-safe:transition-colors`}
        >
          {' '}
          {status}
          {duration}
        </span>
        {isPending && <TypingDots />}
      </summary>
      <div className="border-schedule-border-grey motion-safe:animate-fade-down space-y-2 border-t px-3 py-2">
        <div>
          <div className="font-bold">Arguments</div>
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {pretty(args)}
          </pre>
        </div>
        {!isPending && (
          <div>
            <div className="font-bold">{error ? 'Error' : 'Result'}</div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap">
              {pretty(error ?? result)}
            </pre>
          </div>
        )}
      </div>
    </details>
  )
}
