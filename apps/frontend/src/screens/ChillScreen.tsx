import { Composer } from '../components/Composer'
import { Header } from '../components/Header'
import { useStickToBottom } from '../components/useStickToBottom'
import { BarScene } from '../modes/chill/BarScene'
import { ChillMessages } from '../modes/chill/ChillMessages'
import { formatRemaining } from '../modes/chill/breakMachine'
import { useChillChat } from '../modes/chill/useChillChat'
import type { ScreenProps } from './types'

const EXAMPLES = [
  "What's on the menu at Alma 2 today?",
  'Which library is least busy right now?',
  'Where is my next class?',
]

export function ChillScreen({
  models,
  model,
  onModelChange,
  onHome,
}: ScreenProps) {
  const chat = useChillChat(model, models[0])
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } =
    useStickToBottom<HTMLElement>()
  const isOnBreak = chat.breakState.phase === 'break'

  const handleSend = (text: string) => {
    scrollToBottom()
    chat.send(text)
  }

  return (
    <div className="flex h-dvh flex-col">
      <Header
        models={models}
        model={model}
        onModelChange={onModelChange}
        onNewChat={chat.newChat}
        onHome={onHome}
      />
      <div className="px-4 pt-3">
        <BarScene
          breakState={chat.breakState}
          gagLine={chat.gagState.line}
          banterLine={chat.banterState.line}
          pip={chat.gagState.pip}
        />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <main
          ref={scrollRef}
          className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4"
        >
          <div ref={contentRef}>
            {chat.messages.length === 0 && (
              <div className="space-y-2 pt-4 text-center">
                <p className="font-title text-heading text-3xl">
                  Pull up a stool
                </p>
                {EXAMPLES.map(example => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleSend(example)}
                    className="bg-surface hover:bg-cardbg block w-full rounded-md px-3 py-2 text-sm shadow-sm"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
            <ChillMessages
              messages={chat.messages}
              durations={chat.durations}
              isRunning={chat.isRunning}
            />
            {chat.error && (
              <p className="bg-danger/10 text-danger mt-3 rounded-md px-3 py-2 text-sm">
                {chat.error}
              </p>
            )}
          </div>
        </main>
        {!isAtBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="bg-sidenav-blue hover:bg-sidenav-secondary motion-safe:animate-fade-up absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm text-white shadow-md"
          >
            Jump to latest ↓
          </button>
        )}
      </div>
      <footer className="mx-auto w-full max-w-3xl space-y-2 p-4 pt-0">
        {isOnBreak && (
          <div
            role="status"
            className="bg-surface text-main-text border-main flex items-center justify-between gap-3 rounded-md border-l-4 px-3 py-2 text-sm shadow-sm"
          >
            <span>
              <b className="text-heading">Gus is on a Stella Artois break.</b>{' '}
              He won’t answer questions until he is back.
            </span>
            <span className="shrink-0">
              Back in{' '}
              <time
                role="timer"
                className="font-title text-heading text-xl tabular-nums"
              >
                {formatRemaining(chat.breakState.remainingMs)}
              </time>
            </span>
          </div>
        )}
        <Composer
          isDisabled={chat.isRunning || !model}
          onSend={handleSend}
        />
      </footer>
    </div>
  )
}
