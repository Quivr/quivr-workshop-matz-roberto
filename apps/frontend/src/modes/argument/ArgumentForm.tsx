import { useState, type FormEvent } from 'react'

type Props = {
  placeholder: string
  isDisabled: boolean
  onSend: (text: string) => void
}

/** The student's message box under the shared thread. */
export function ArgumentForm({ placeholder, isDisabled, onSend }: Props) {
  const [text, setText] = useState('')

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
      className="flex gap-2 p-4 pt-0"
    >
      <input
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder={placeholder}
        disabled={isDisabled}
        aria-label="Message the characters"
        className="border-schedule-border-grey focus:border-sidenav-blue dark:focus:border-main bg-surface min-w-0 flex-1 rounded-md border px-3 py-2 outline-none focus:shadow-sm disabled:opacity-50 motion-safe:transition-[border-color,box-shadow]"
      />
      <button
        type="submit"
        disabled={isDisabled}
        className="bg-main text-sidenav-blue rounded-md px-4 py-2 font-bold hover:brightness-95 active:scale-95 disabled:opacity-50 motion-safe:transition motion-safe:disabled:active:scale-100"
      >
        Send
      </button>
    </form>
  )
}
