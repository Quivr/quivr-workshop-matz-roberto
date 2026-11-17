import type { CSSProperties } from 'react'

const atNoon = (date: string) => new Date(`${date}T12:00:00Z`)

/** "2026-11-19" → "Thu 19 Nov" */
export const shortDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(atNoon(date))

/** "2026-11-19" → "Thu" */
export const weekdayShort = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(atNoon(date))

/** "2026-11-19" → "Thursday 19 November" */
export const longDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(atNoon(date))

/** "12:15" → minutes since midnight */
export const minutesOf = (hhmm: string) => {
  const [hours = '0', minutes = '0'] = hhmm.split(':')
  return Number(hours) * 60 + Number(minutes)
}

/** "HH:MM" passes through; ISO timestamps become Brussels "HH:MM". */
export const formatTime = (value: string) => {
  if (/^\d{1,2}:\d{2}$/.test(value)) return value
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return value
  return time.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
  })
}

export const euro = (price: number) => `€${price.toFixed(2)}`

/** "Camille" → "C", "Jean Luc" → "JL" */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map(part => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** Typed way to set CSS custom properties from inline styles. */
export const vars = (values: Record<string, string | number>) =>
  values as CSSProperties
