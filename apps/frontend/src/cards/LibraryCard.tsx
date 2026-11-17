import { Card } from './Card'
import type { CardProps } from './types'

type Library = {
  id: string
  name: string
  address?: string
  occupancy?: number
  capacity?: number
  percentFull?: number
  measuredAt?: string
}

/** A library only counts as measured when its sensors report a real capacity. */
type MeasuredLibrary = Library & {
  occupancy: number
  capacity: number
  percentFull: number
}

const isMeasured = (library: Library): library is MeasuredLibrary =>
  library.occupancy !== undefined &&
  library.capacity !== undefined &&
  library.percentFull !== undefined

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
  })

const barColour = (percentFull: number) => {
  if (percentFull < 50) return 'bg-green-status'
  if (percentFull < 80) return 'bg-main'
  return 'bg-danger'
}

function OccupancyBar({ percentFull }: { percentFull: number }) {
  return (
    <div className="bg-schedule-bg-grey mt-1 h-1.5 overflow-hidden rounded-full">
      <div
        className={`h-full rounded-full ${barColour(percentFull)}`}
        style={{ width: `${Math.min(percentFull, 100)}%` }}
      />
    </div>
  )
}

export function LibraryCard({ result }: CardProps) {
  const libraries = (result ?? []) as Library[]

  // Most libraries report no capacity at all. Listing them row by row would
  // bury the ones that actually answer "where can I find a seat", so they are
  // collapsed into a single line at the bottom.
  const measured = libraries
    .filter(isMeasured)
    .sort((a, b) => a.percentFull - b.percentFull)
  const unmeasured = libraries
    .filter(library => !isMeasured(library))
    .sort((a, b) => a.name.localeCompare(b.name))

  const measuredAt = measured.find(library => library.measuredAt)?.measuredAt
  const subtitle =
    libraries.length === 0
      ? 'no libraries'
      : [
          unmeasured.length === 0
            ? `${libraries.length} ${libraries.length === 1 ? 'library' : 'libraries'}`
            : `${measured.length} of ${libraries.length} with live data`,
          measuredAt && `measured ${time(measuredAt)}`,
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <Card
      title="Library occupancy"
      subtitle={subtitle}
    >
      {libraries.length === 0 && <p>No libraries found.</p>}
      {libraries.length > 0 && measured.length === 0 && (
        <p>No library is reporting occupancy right now.</p>
      )}
      {measured.length > 0 && (
        <ul className="space-y-2">
          {measured.map(library => (
            <li
              key={library.id}
              title={library.address}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate">{library.name}</span>
                <span className="shrink-0 text-xs">
                  {library.occupancy} / {library.capacity}
                  <span className="ml-1.5 font-bold">
                    {library.percentFull}%
                  </span>
                </span>
              </div>
              <OccupancyBar percentFull={library.percentFull} />
            </li>
          ))}
        </ul>
      )}
      {unmeasured.length > 0 && (
        <details className="border-schedule-border-grey text-muted mt-3 border-t pt-2 text-xs">
          <summary className="cursor-pointer">
            {unmeasured.length}{' '}
            {unmeasured.length === 1 ? 'library' : 'libraries'} without sensor
            data
          </summary>
          <p className="mt-1">
            {unmeasured.map(library => library.name).join(', ')}
          </p>
        </details>
      )}
    </Card>
  )
}
