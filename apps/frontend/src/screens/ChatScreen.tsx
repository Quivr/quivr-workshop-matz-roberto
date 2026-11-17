import { useEffect, useRef, useState } from 'react'

import { Composer } from '../components/Composer'
import { Header } from '../components/Header'
import { MessageList } from '../components/MessageList'
import { TracesPanel } from '../components/TracesPanel'
import { useStickToBottom } from '../components/useStickToBottom'
import { useAgentChat } from '../useAgentChat'
import type { ScreenProps } from './types'

const EXAMPLES = [
  "What's on the menu at Alma 2 today and where is my next class?",
  'Which library is least busy right now?',
  "What's vegetarian at the student restaurants tomorrow?",
]

export function ChatScreen({
  models,
  model,
  onModelChange,
  onHome,
}: ScreenProps) {
  const chat = useAgentChat()
  const [isShowingTraces, setIsShowingTraces] = useState(false)
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } =
    useStickToBottom<HTMLElement>()

  const resetRef = useRef(chat.reset)
  useEffect(() => {
    resetRef.current = chat.reset
  })
  useEffect(() => () => resetRef.current(), [])

  const handleSend = (text: string) => {
    scrollToBottom()
    void chat.send(text, model)
  }

  return (
    <div className="flex h-dvh flex-col">
      <Header
        models={models}
        model={model}
        isShowingTraces={isShowingTraces}
        onModelChange={onModelChange}
        onNewChat={chat.reset}
        onToggleTraces={() => setIsShowingTraces(value => !value)}
        onHome={onHome}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <main
          ref={scrollRef}
          className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4"
        >
          <div ref={contentRef}>
            {isShowingTraces && <TracesPanel />}
            {!isShowingTraces && chat.messages.length === 0 && (
              <div className="space-y-2 pt-10 text-center">
                <p className="font-title text-sidenav-blue text-3xl">
                  What do you want to know?
                </p>
                {EXAMPLES.map(example => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleSend(example)}
                    className="hover:bg-cardbg block w-full rounded-md bg-white px-3 py-2 text-sm shadow-sm"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
            {!isShowingTraces && (
              <MessageList
                messages={chat.messages}
                durations={chat.durations}
                isRunning={chat.isRunning}
              />
            )}
            {chat.error && !isShowingTraces && (
              <p className="bg-danger/10 text-danger mt-3 rounded-md px-3 py-2 text-sm">
                {chat.error}
              </p>
            )}
          </div>
        </main>
        {!isAtBottom && !isShowingTraces && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="bg-sidenav-blue hover:bg-sidenav-secondary motion-safe:animate-fade-up absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm text-white shadow-md"
          >
            Jump to latest ↓
          </button>
        )}
      </div>
      {!isShowingTraces && (
        <footer className="mx-auto w-full max-w-3xl p-4 pt-0">
          <Composer
            isDisabled={chat.isRunning || !model}
            onSend={handleSend}
          />
        </footer>
      )}
    </div>
  )
}
