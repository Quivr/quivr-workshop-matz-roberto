type Props = {
  models: string[]
  model: string
  onModelChange: (model: string) => void
  isShowingTraces?: boolean
  onNewChat?: () => void
  onToggleTraces?: () => void
  onHome?: () => void
}

const buttonClass = 'rounded px-2 py-1 text-sm hover:bg-sidenav-secondary'

export function Header({
  models,
  model,
  isShowingTraces = false,
  onModelChange,
  onNewChat,
  onToggleTraces,
  onHome,
}: Props) {
  return (
    <header className="bg-sidenav-blue flex flex-wrap items-center gap-3 px-4 py-2 text-white">
      {onHome && (
        <button
          type="button"
          onClick={onHome}
          className={buttonClass}
        >
          ← Home
        </button>
      )}
      <img
        src="/logo.svg"
        alt=""
        className="h-8 w-8"
      />
      <h1 className="font-title text-main mr-auto text-3xl tracking-wide">
        Ask Quivr
      </h1>
      <select
        value={model}
        onChange={event => onModelChange(event.target.value)}
        className="bg-sidenav-secondary rounded px-2 py-1 text-sm"
        aria-label="Model"
      >
        {models.map(id => (
          <option
            key={id}
            value={id}
          >
            {id}
          </option>
        ))}
      </select>
      {onToggleTraces && (
        <button
          type="button"
          onClick={onToggleTraces}
          className={buttonClass}
        >
          {isShowingTraces ? 'Chat' : 'Traces'}
        </button>
      )}
      {onNewChat && (
        <button
          type="button"
          onClick={onNewChat}
          className={buttonClass}
        >
          New chat
        </button>
      )}
    </header>
  )
}
