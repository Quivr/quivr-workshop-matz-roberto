import { useEffect, useState, type CSSProperties } from 'react'

import { ChatActionsContext } from '../cards/chat-actions'
import { Composer } from '../components/Composer'
import '../components/empty-state.css'
import { Header } from '../components/Header'
import { HeartCurtain } from '../components/HeartCurtain'
import { MessageList } from '../components/MessageList'
import { TracesPanel } from '../components/TracesPanel'
import { useStickToBottom } from '../components/useStickToBottom'
import { askThroughGate } from '../subscription/askGate'
import { QuestionStatus } from '../subscription/QuestionStatus'
import type { useAgentChat } from '../useAgentChat'
import { useWallet } from '../wallet'
import type { ScreenProps } from './types'

const LOVE_EMOJI = '💘'

const EXAMPLES = [
  'Help me find a girlfriend 💘',
  "What's on the menu at Alma 2 today and where is my next class?",
  'Which library is least busy right now?',
  "What's vegetarian at the student restaurants tomorrow?",
]

type Props = ScreenProps & { chat: ReturnType<typeof useAgentChat> }

export function ChatScreen({
  chat,
  models,
  model,
  onModelChange,
  onHome,
}: Props) {
  const wallet = useWallet()
  const [isShowingTraces, setIsShowingTraces] = useState(false)
  // 0 = no curtain; bumped on every 💘 click so the curtain replays.
  const [curtainKey, setCurtainKey] = useState(0)
  const [composeRequest, setComposeRequest] = useState<{
    id: number
    text: string
  }>()
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } =
    useStickToBottom<HTMLElement>()

  const { abort } = chat
  useEffect(() => abort, [abort])

  const handleCompose = (text: string) =>
    setComposeRequest(previous => ({ id: (previous?.id ?? 0) + 1, text }))
  const sendToAgent = (text: string) => {
    scrollToBottom()
    void chat.send(text, model)
  }
  // Typed and example questions go through the free-question gate. Keep the
  // text in the composer when blocked, so nothing is lost behind the paywall.
  const handleSend = (text: string): boolean => {
    const wasSent = askThroughGate(wallet.spendQuestion, () =>
      sendToAgent(text)
    )
    if (!wasSent) handleCompose(text)
    return wasSent
  }
  const handlePaidAction = (text: string) => {
    if (chat.isRunning || !model) return
    if (wallet.spendAction()) sendToAgent(text)
  }
  const handleExample = (example: string) => {
    if (handleSend(example) && example.includes(LOVE_EMOJI))
      setCurtainKey(key => key + 1)
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
                <p className="font-title text-heading text-3xl">
                  What do you want to know?
                </p>
                {EXAMPLES.map((example, index) => {
                  const isLove = example.includes(LOVE_EMOJI)
                  return (
                    <button
                      key={example}
                      type="button"
                      onClick={() => handleExample(example)}
                      style={{ '--empty-state-index': index } as CSSProperties}
                      className={`empty-state__example hover:bg-cardbg bg-surface block w-full rounded-md px-3 py-2 text-sm shadow-sm ${isLove ? 'empty-state__example--love' : ''}`}
                    >
                      {isLove ? (
                        <>
                          {example.replace(LOVE_EMOJI, '').trimEnd()}{' '}
                          <span className="empty-state__heart">
                            {LOVE_EMOJI}
                          </span>
                        </>
                      ) : (
                        example
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {!isShowingTraces && (
              <ChatActionsContext
                value={{
                  send: handlePaidAction,
                  canSend: !chat.isRunning && Boolean(model),
                }}
              >
                <MessageList
                  messages={chat.messages}
                  durations={chat.durations}
                  isRunning={chat.isRunning}
                  onAction={handlePaidAction}
                  onCompose={handleCompose}
                  actionsDisabled={chat.isRunning || !model}
                />
              </ChatActionsContext>
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
          <QuestionStatus />
          <Composer
            key={composeRequest?.id ?? 0}
            isDisabled={chat.isRunning || !model}
            onSend={handleSend}
            prefill={composeRequest?.text}
          />
        </footer>
      )}
      {curtainKey > 0 && (
        <HeartCurtain
          key={curtainKey}
          onDone={() => setCurtainKey(0)}
        />
      )}
    </div>
  )
}
