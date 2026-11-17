import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SpeechBalloon } from './SpeechBalloon'

describe('SpeechBalloon', () => {
  it('shows its text and points left by default', () => {
    const html = renderToStaticMarkup(
      <SpeechBalloon>Hello there</SpeechBalloon>
    )
    expect(html).toContain('Hello there')
    expect(html).toContain('-left-1.5')
    expect(html).not.toContain('-right-1.5')
    expect(html).not.toContain('animate-dot')
  })

  it('points right on request', () => {
    const html = renderToStaticMarkup(
      <SpeechBalloon side="right">Hi</SpeechBalloon>
    )
    expect(html).toContain('-right-1.5')
    expect(html).not.toContain('-left-1.5')
  })

  it('shows the dots only while speaking with no text yet', () => {
    const waiting = renderToStaticMarkup(
      <SpeechBalloon isSpeaking>{null}</SpeechBalloon>
    )
    expect(waiting).toContain('motion-safe:animate-dot')
    const streaming = renderToStaticMarkup(
      <SpeechBalloon isSpeaking>Alma 2 has</SpeechBalloon>
    )
    expect(streaming).toContain('Alma 2 has')
    expect(streaming).not.toContain('animate-dot')
  })

  it('uses theme tokens only and keeps motion behind motion-safe', () => {
    const html = renderToStaticMarkup(
      <SpeechBalloon isSpeaking>{null}</SpeechBalloon>
    )
    expect(html).not.toMatch(/bg-white|#[0-9a-f]{3,6}/i)
    for (const [, name] of html.matchAll(
      /(?<!motion-safe:)(animate-[\w-]+)/g
    )) {
      throw new Error(`${name} is not behind motion-safe:`)
    }
  })
})
