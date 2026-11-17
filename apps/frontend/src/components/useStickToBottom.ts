import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_THRESHOLD = 48
const SMOOTH_SCROLL_MAX_MS = 1000
const USER_INPUT_EVENTS = ['wheel', 'touchstart', 'keydown']

type Options = {
  /** Distance in px from the bottom that still counts as "at the bottom". */
  threshold?: number
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Keeps a scroll container pinned to its bottom while its content grows
 * (streaming text, tool cards, images), until the user scrolls away.
 *
 * Usage: `scrollRef` goes on the element that scrolls (any element, not the
 * window) and `contentRef` on a single child that wraps everything inside it.
 * Both are callback refs, so they also work when the elements mount late.
 * Content growth is detected with a ResizeObserver on `contentRef`, so nothing
 * needs to be passed in. Call the hook once per scroll container.
 *
 * `isAtBottom` is meant for UI (show a "Jump to latest" button when false).
 * `scrollToBottom` scrolls down and re-arms the follow lock.
 */
export function useStickToBottom<
  S extends HTMLElement = HTMLDivElement,
  C extends HTMLElement = HTMLDivElement,
>({ threshold = DEFAULT_THRESHOLD }: Options = {}) {
  const [scrollElement, setScrollElement] = useState<S | null>(null)
  const [contentElement, setContentElement] = useState<C | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const isStuckRef = useRef(true)
  const isSmoothScrollingRef = useRef(false)
  const smoothTimerRef = useRef<number | undefined>(undefined)
  const stopSmoothScrollRef = useRef<() => void>(() => {})

  const scrollToBottom = useCallback(() => {
    isStuckRef.current = true
    const element = scrollElement
    if (!element) return
    const top = element.scrollHeight - element.clientHeight
    if (top - element.scrollTop < 1) return setIsAtBottom(true)
    if (prefersReducedMotion()) {
      element.scrollTo({ top, behavior: 'instant' })
      return
    }
    // Intermediate scroll events of a smooth scroll must not release the lock.
    isSmoothScrollingRef.current = true
    window.clearTimeout(smoothTimerRef.current)
    smoothTimerRef.current = window.setTimeout(
      () => stopSmoothScrollRef.current(),
      SMOOTH_SCROLL_MAX_MS
    )
    element.scrollTo({ top, behavior: 'smooth' })
  }, [scrollElement])

  useEffect(() => {
    if (!scrollElement) return

    let lastTop = scrollElement.scrollTop
    let lastHeight = scrollElement.scrollHeight

    const distanceFromBottom = () =>
      scrollElement.scrollHeight -
      scrollElement.scrollTop -
      scrollElement.clientHeight

    const remember = () => {
      lastTop = scrollElement.scrollTop
      lastHeight = scrollElement.scrollHeight
    }

    const stopSmoothScroll = () => {
      isSmoothScrollingRef.current = false
      window.clearTimeout(smoothTimerRef.current)
    }
    stopSmoothScrollRef.current = stopSmoothScroll

    const follow = () => {
      stopSmoothScroll()
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'instant',
      })
      remember()
      setIsAtBottom(true)
    }

    const handleScroll = () => {
      const nearBottom = distanceFromBottom() <= threshold
      if (isSmoothScrollingRef.current) {
        if (nearBottom) {
          stopSmoothScroll()
          isStuckRef.current = true
          setIsAtBottom(true)
        }
        remember()
        return
      }
      // Moving up without the content having changed size is the user.
      const scrolledUp =
        scrollElement.scrollTop < lastTop &&
        scrollElement.scrollHeight === lastHeight
      isStuckRef.current = nearBottom && !scrolledUp
      setIsAtBottom(nearBottom)
      remember()
    }

    const handleContentChange = () => {
      if (isStuckRef.current) return follow()
      lastHeight = scrollElement.scrollHeight
      setIsAtBottom(distanceFromBottom() <= threshold)
    }

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    scrollElement.addEventListener('scrollend', stopSmoothScroll)
    for (const name of USER_INPUT_EVENTS) {
      scrollElement.addEventListener(name, stopSmoothScroll, { passive: true })
    }
    const observer = new ResizeObserver(handleContentChange)
    observer.observe(scrollElement)
    if (contentElement) observer.observe(contentElement)
    handleContentChange()

    return () => {
      stopSmoothScroll()
      scrollElement.removeEventListener('scroll', handleScroll)
      scrollElement.removeEventListener('scrollend', stopSmoothScroll)
      for (const name of USER_INPUT_EVENTS) {
        scrollElement.removeEventListener(name, stopSmoothScroll)
      }
      observer.disconnect()
    }
  }, [scrollElement, contentElement, threshold])

  return {
    scrollRef: setScrollElement,
    contentRef: setContentElement,
    isAtBottom,
    scrollToBottom,
  }
}
