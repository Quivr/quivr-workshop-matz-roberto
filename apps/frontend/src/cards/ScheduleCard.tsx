import { Card } from './Card'
import type { CardProps } from './types'

type ScheduleItem = {
  kind: 'class' | 'event'
  title: string
  start: string
  end: string
  location?: string
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
  })

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Brussels',
  })

export function ScheduleCard({ result }: CardProps) {
  const items = (result ?? []) as ScheduleItem[]

  return (
    <Card
      title="Schedule"
      subtitle={`${items.length} items`}
    >
      {items.length === 0 && <p>Nothing scheduled.</p>}
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li
            key={`${item.start}-${item.title}-${index}`}
            className="bg-schedule-bg-grey flex gap-3 rounded px-2 py-1.5"
          >
            <div className="w-24 shrink-0 text-xs">
              <div className="font-bold">{day(item.start)}</div>
              <div>
                {time(item.start)}–{time(item.end)}
              </div>
            </div>
            <div>
              <div className="font-bold">{item.title}</div>
              {item.location && (
                <div className="text-xs">📍 {item.location}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
