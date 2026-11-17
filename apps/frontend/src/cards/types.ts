/** What every tool card gets. `result` is the parsed JSON the tool returned. */
export type CardProps = {
  toolName: string
  args: unknown
  result: unknown
  error?: string
  isPending: boolean
  durationMs?: number
  onAction?: (text: string) => void
  onCompose?: (text: string) => void
  actionsDisabled?: boolean
}
