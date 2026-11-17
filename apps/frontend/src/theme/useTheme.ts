import { useCallback, useLayoutEffect, useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

// Keep in sync with the inline script in index.html.
const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

// localStorage can throw (private mode, blocked storage): fall back to memory.
let memoryPreference: ThemePreference = 'system'

const readPreference = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isPreference(stored) ? stored : 'system'
  } catch {
    return memoryPreference
  }
}

const writePreference = (preference: ThemePreference) => {
  memoryPreference = preference
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Not persisted, but still applied for this session.
  }
  notify()
}

const subscribePreference = (listener: () => void) => {
  listeners.add(listener)
  // Other tabs changing the preference.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

const subscribeSystem = (listener: () => void) => {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

const getSystemIsDark = () => window.matchMedia(DARK_QUERY).matches

/** Current theme preference, the theme it resolves to, and a setter. */
export function useTheme() {
  const preference = useSyncExternalStore(subscribePreference, readPreference)
  const systemIsDark = useSyncExternalStore(subscribeSystem, getSystemIsDark)

  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  const setPreference = useCallback(
    (next: ThemePreference) => writePreference(next),
    []
  )

  return { preference, resolvedTheme, setPreference }
}
