import { useEffect, useRef, type ReactNode } from 'react'

import { CharacterAvatar } from '../../characters/CharacterAvatar'
import { getCharacter } from '../../characters/registry'
import { Markdown } from '../../components/Markdown'
import { SpeechBalloon } from '../../components/SpeechBalloon'
import { useStickToBottom } from '../../components/useStickToBottom'
import type { Row } from './rows'
import { ToolGroup } from './ToolGroup'

const AT_BOTTOM_PX = 48
const AVATAR = 44
/** Gap between an avatar and the content next to it. */
const GAP = 8

type Props = {
  cast: readonly string[]
  rows: Row[]
  durations: Record<string, number>
  error: string | null
  /** Size of the avatar beside each balloon. */
  avatarSize?: number
}

/** A character's avatar and balloon; the first and third sit left, the second right. */
function Speech({
  characterId,
  side,
  isSpeaking,
  size,
  children,
}: {
  size: number
  characterId: string
  side: 'left' | 'right'
  isSpeaking: boolean
  children?: ReactNode
}) {
  const character = getCharacter(characterId)
  return (
    <div
      className={`flex items-start gap-2 ${side === 'right' ? 'flex-row-reverse' : ''}`}
    >
      <CharacterAvatar
        characterId={characterId}
        clip={isSpeaking ? 'talking' : 'idle'}
        size={size}
      />
      <div
        className={`max-w-[85%] min-w-0 ${side === 'right' ? 'flex flex-col items-end' : ''}`}
      >
        <span className="text-muted mb-0.5 flex items-center gap-1.5 px-1 text-xs font-bold">
          <span
            aria-hidden
            className={`ring-main-text/40 size-2 rounded-full ring-1 ${character?.colorClass ?? ''}`}
          />
          {character?.name ?? characterId}
        </span>
        <SpeechBalloon
          side={side}
          isSpeaking={isSpeaking}
          className="max-w-full min-w-0 text-sm sm:max-w-lg"
        >
          {children}
        </SpeechBalloon>
      </div>
    </div>
  )
}

/** The one shared conversation. Owns its scroll container. */
export function ArgumentThread({
  cast,
  rows,
  durations,
  error,
  avatarSize = AVATAR,
}: Props) {
  const { scrollRef, contentRef, scrollToBottom } = useStickToBottom()
  const sideOf = (id: string) => (cast.indexOf(id) % 2 === 0 ? 'left' : 'right')

  // Left alone when the student has scrolled up to read.
  const isAwayRef = useRef(false)
  const distanceFromBottom = (element: HTMLElement) =>
    element.scrollHeight - element.scrollTop - element.clientHeight
  const noteUserScroll = (element: HTMLElement) =>
    requestAnimationFrame(() => {
      isAwayRef.current = distanceFromBottom(element) > AT_BOTTOM_PX
    })
  // The hook follows streaming text; big jumps (a new balloon, a tool card) can
  // slip past it, so every new row pins the thread to the bottom again.
  useEffect(() => {
    if (!isAwayRef.current) scrollToBottom()
  }, [rows.length, scrollToBottom])

  return (
    <div
      ref={scrollRef}
      onWheel={event => noteUserScroll(event.currentTarget)}
      onTouchMove={event => noteUserScroll(event.currentTarget)}
      onScroll={event => {
        if (distanceFromBottom(event.currentTarget) <= AT_BOTTOM_PX) {
          isAwayRef.current = false
        }
      }}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
    >
      <div
        ref={contentRef}
        className="space-y-3"
      >
        {rows.map(row => {
          if (row.kind === 'student') {
            return (
              <div
                key={row.id}
                className="bg-main text-sidenav-blue motion-safe:animate-fade-up ml-auto w-fit max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
              >
                {row.text}
              </div>
            )
          }
          if (row.kind === 'tools') {
            const side = sideOf(row.speaker)
            return (
              <div
                key={row.id}
                className={`max-w-md ${side === 'right' ? 'ml-auto' : ''}`}
                style={{
                  [side === 'right' ? 'marginRight' : 'marginLeft']:
                    avatarSize + GAP,
                }}
              >
                <ToolGroup
                  calls={row.calls}
                  durations={durations}
                />
              </div>
            )
          }
          return (
            <Speech
              key={row.id}
              characterId={row.speaker}
              side={sideOf(row.speaker)}
              size={avatarSize}
              isSpeaking={row.kind === 'waiting' || row.isSpeaking}
            >
              {row.kind === 'say' && <Markdown>{row.text}</Markdown>}
            </Speech>
          )
        })}
        {error && (
          <p className="bg-danger/10 text-danger rounded-md px-3 py-2 text-sm">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
