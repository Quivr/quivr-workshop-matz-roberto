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

  // Quietest first, so the card answers "where can I find a seat".
  // Libraries without sensors have no answer to give: they go last.
  const sorted = [...libraries].sort((a, b) => {
    if (isMeasured(a) && isMeasured(b)) return a.percentFull - b.percentFull
    if (isMeasured(a)) return -1
    if (isMeasured(b)) return 1
    return a.name.localeCompare(b.name)
  })

  const measuredAt = sorted.find(library => library.measuredAt)?.measuredAt
  const subtitle = [
    `${libraries.length} ${libraries.length === 1 ? 'library' : 'libraries'}`,
    measuredAt && `measured ${time(measuredAt)}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card
      title="Library occupancy"
      subtitle={subtitle}
    >
      {sorted.length === 0 && <p>No libraries found.</p>}
      <ul className="space-y-2">
        {sorted.map(library => (
          <li
            key={library.id}
            title={library.address}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate">{library.name}</span>
              {isMeasured(library) ? (
                <span className="shrink-0 text-xs">
                  {library.occupancy} / {library.capacity}
                  <span className="ml-1.5 font-bold">
                    {library.percentFull}%
                  </span>
                </span>
              ) : (
                <span className="text-sidenav-secondary shrink-0 text-xs italic">
                  no sensor data
                </span>
              )}
            </div>
            {isMeasured(library) && (
              <OccupancyBar percentFull={library.percentFull} />
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
