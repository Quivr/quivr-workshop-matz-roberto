import { useState, type FormEvent } from 'react'

type Props = {
  isDisabled: boolean
  onSend: (text: string) => void
  prefill?: string
}

export function Composer({ isDisabled, onSend, prefill }: Props) {
  const [text, setText] = useState(prefill ?? '')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isDisabled) return
    onSend(trimmed)
    setText('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2"
    >
      <input
        value={text}
        onChange={event => setText(event.target.value)}
        aria-label="Message"
        placeholder="Ask about your schedule, menus, libraries…"
        className="border-muted focus:border-sidenav-blue dark:focus:border-main bg-surface flex-1 rounded-md border px-3 py-2 focus:shadow-sm motion-safe:transition-[border-color,box-shadow]"
        autoFocus
      />
      <button
        type="submit"
        aria-disabled={isDisabled}
        className="bg-main text-sidenav-blue rounded-md px-4 py-2 font-bold hover:brightness-95 aria-disabled:opacity-50 motion-safe:transition motion-safe:active:scale-95 motion-safe:aria-disabled:active:scale-100"
      >
        Send
      </button>
    </form>
  )
}
