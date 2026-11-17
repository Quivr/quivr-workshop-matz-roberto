import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_THRESHOLD = 48
/** Upward movement from the pinned position that counts as the user scrolling away. */
const RELEASE_DISTANCE = 24
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
 *
 * The lock is only released by the user moving the scroll position up, never
 * by content growing, however much and however fast it grows.
 */
export function useStickToBottom<
  S extends HTMLElement = HTMLDivElement,
  C extends HTMLElement = HTMLDivElement,
>({ threshold = DEFAULT_THRESHOLD }: Options = {}) {
  const [scrollElement, setScrollElement] = useState<S | null>(null)
  const [contentElement, setContentElement] = useState<C | null>(null)
  const [isAtBottom, setIsAtBottomState] = useState(true)
  const isAtBottomRef = useRef(true)
  const isStuckRef = useRef(true)
  /** Highest scrollTop reached while pinned: the reference for "scrolled up". */
  const pinnedTopRef = useRef(0)
  const isSmoothScrollingRef = useRef(false)
  const smoothTimerRef = useRef<number | undefined>(undefined)

  const setIsAtBottom = useCallback((value: boolean) => {
    if (isAtBottomRef.current === value) return
    isAtBottomRef.current = value
    setIsAtBottomState(value)
  }, [])

  const stopSmoothScroll = useCallback(() => {
    isSmoothScrollingRef.current = false
    window.clearTimeout(smoothTimerRef.current)
  }, [])

  const scrollToBottom = useCallback(() => {
    isStuckRef.current = true
    const element = scrollElement
    if (!element) return
    const top = element.scrollHeight - element.clientHeight
    if (top - element.scrollTop < 1) {
      pinnedTopRef.current = element.scrollTop
      return setIsAtBottom(true)
    }
    if (prefersReducedMotion()) {
      element.scrollTo({ top, behavior: 'instant' })
      pinnedTopRef.current = top
      return setIsAtBottom(true)
    }
    // Intermediate scroll events of a smooth scroll must not release the lock.
    pinnedTopRef.current = element.scrollTop
    isSmoothScrollingRef.current = true
    window.clearTimeout(smoothTimerRef.current)
    smoothTimerRef.current = window.setTimeout(
      stopSmoothScroll,
      SMOOTH_SCROLL_MAX_MS
    )
    element.scrollTo({ top, behavior: 'smooth' })
  }, [scrollElement, setIsAtBottom, stopSmoothScroll])

  useEffect(() => {
    if (!scrollElement) return

    const maxTop = () => scrollElement.scrollHeight - scrollElement.clientHeight
    const distanceFromBottom = () => maxTop() - scrollElement.scrollTop

    // Runs inside a ResizeObserver callback, i.e. after layout and before
    // paint: one read, one write, and the frame is painted already pinned.
    const handleResize = () => {
      if (!isStuckRef.current) {
        setIsAtBottom(distanceFromBottom() <= threshold)
        return
      }
      stopSmoothScroll()
      const top = maxTop()
      if (scrollElement.scrollTop !== top) {
        scrollElement.scrollTo({ top, behavior: 'instant' })
      }
      pinnedTopRef.current = top
      setIsAtBottom(true)
    }

    const handleScroll = () => {
      const top = scrollElement.scrollTop
      const distance = maxTop() - top
      if (isSmoothScrollingRef.current) {
        if (distance <= threshold) {
          stopSmoothScroll()
          isStuckRef.current = true
          pinnedTopRef.current = top
        }
      } else if (isStuckRef.current) {
        if (distance <= 1) pinnedTopRef.current = top
        else if (pinnedTopRef.current - top >= RELEASE_DISTANCE)
          isStuckRef.current = false
      } else if (distance <= threshold) {
        isStuckRef.current = true
        pinnedTopRef.current = top
      }
      // While pinned, content that outgrew the viewport is about to be followed.
      setIsAtBottom(isStuckRef.current || distance <= threshold)
    }

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    scrollElement.addEventListener('scrollend', stopSmoothScroll)
    for (const name of USER_INPUT_EVENTS) {
      scrollElement.addEventListener(name, stopSmoothScroll, { passive: true })
    }
    const observer = new ResizeObserver(handleResize)
    observer.observe(scrollElement)
    if (contentElement) observer.observe(contentElement)
    handleResize()

    return () => {
      stopSmoothScroll()
      scrollElement.removeEventListener('scroll', handleScroll)
      scrollElement.removeEventListener('scrollend', stopSmoothScroll)
      for (const name of USER_INPUT_EVENTS) {
        scrollElement.removeEventListener(name, stopSmoothScroll)
      }
      observer.disconnect()
    }
  }, [
    scrollElement,
    contentElement,
    threshold,
    setIsAtBottom,
    stopSmoothScroll,
  ])

  return {
    scrollRef: setScrollElement,
    contentRef: setContentElement,
    isAtBottom,
    scrollToBottom,
  }
}
