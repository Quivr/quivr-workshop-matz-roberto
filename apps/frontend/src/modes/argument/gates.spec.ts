import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pause, waitUntilVisible } from './gates'

const fakeDocument = () => {
  const listeners = new Set<() => void>()
  let hidden = true
  return {
    target: {
      addEventListener: (
        _: string,
        listener: EventListenerOrEventListenerObject
      ) => listeners.add(listener as () => void),
      removeEventListener: (
        _: string,
        listener: EventListenerOrEventListenerObject
      ) => listeners.delete(listener as () => void),
    },
    isHidden: () => hidden,
    setHidden(value: boolean) {
      hidden = value
      listeners.forEach(listener => listener())
    },
    count: () => listeners.size,
  }
}

describe('waitUntilVisible', () => {
  it('resolves at once while the tab is visible', async () => {
    const page = fakeDocument()
    page.setHidden(false)
    const signal = new AbortController().signal
    await expect(
      waitUntilVisible(signal, page.isHidden, page.target)
    ).resolves.toBe(true)
    expect(page.count()).toBe(0)
  })

  it('waits while hidden and goes on when the tab comes back', async () => {
    const page = fakeDocument()
    const controller = new AbortController()
    const waiting = vi.fn()
    void waitUntilVisible(controller.signal, page.isHidden, page.target).then(
      waiting
    )
    await Promise.resolve()
    expect(waiting).not.toHaveBeenCalled()
    expect(page.count()).toBe(1)
    page.setHidden(false)
    await Promise.resolve()
    expect(waiting).toHaveBeenCalledWith(true)
    expect(page.count()).toBe(0)
  })

  it('gives up on abort and removes its listener', async () => {
    const page = fakeDocument()
    const controller = new AbortController()
    const result = waitUntilVisible(
      controller.signal,
      page.isHidden,
      page.target
    )
    controller.abort()
    await expect(result).resolves.toBe(false)
    expect(page.count()).toBe(0)
  })
})

describe('pause', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('resolves true after the delay', async () => {
    const result = pause(1_000, new AbortController().signal)
    await vi.advanceTimersByTimeAsync(1_000)
    await expect(result).resolves.toBe(true)
  })

  it('resolves false on abort and leaves no timer behind', async () => {
    const controller = new AbortController()
    const result = pause(1_000, controller.signal)
    controller.abort()
    await expect(result).resolves.toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not even start when already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(pause(1_000, controller.signal)).resolves.toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})
