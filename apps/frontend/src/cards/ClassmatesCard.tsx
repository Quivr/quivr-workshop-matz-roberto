import type { ReactNode } from 'react'

import { Card } from './Card'
import {
  formatDay,
  formatRange,
  groupClassmates,
  parseClassmates,
  plural,
} from './classmates'
import type { ClassSlot, Classmate } from './classmates'
import type { CardProps } from './types'

const VISIBLE = 6

/** First `VISIBLE` items inline, the rest behind a native <details>. */
function Overflow<T>({
  items,
  render,
  wrapper,
}: {
  items: T[]
  render: (item: T, index: number) => ReactNode
  wrapper: (children: ReactNode) => ReactNode
}) {
  const rest = items.slice(VISIBLE)
  return (
    <>
      {wrapper(items.slice(0, VISIBLE).map(render))}
      {rest.length > 0 && (
        <details className="mt-1">
          <summary className="text-muted cursor-pointer text-xs select-none">
            +{rest.length} more
          </summary>
          <div className="mt-1">
            {wrapper(rest.map((item, i) => render(item, VISIBLE + i)))}
          </div>
        </details>
      )}
    </>
  )
}

function SameClassChip({ classmate }: { classmate: Classmate }) {
  return (
    <li
      title={`${classmate.name} is in this class`}
      className="bg-vegan text-on-diet max-w-full rounded-2xl px-2 py-0.5 text-xs font-bold break-words"
    >
      {classmate.name}
    </li>
  )
}

function BusyRow({ classmate }: { classmate: Classmate }) {
  const where = [
    classmate.title || 'something else',
    classmate.start && classmate.end
      ? formatRange(classmate.start, classmate.end)
      : null,
    classmate.location ? `📍 ${classmate.location}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="min-w-0 text-xs">
      <div
        title={classmate.name}
        className="text-heading font-bold break-words"
      >
        {classmate.name}
      </div>
      <div className="text-muted break-words">{where}</div>
    </li>
  )
}

function ClassBlock({ slot }: { slot: ClassSlot }) {
  const { sameClass, busyElsewhere } = groupClassmates(slot.classmates)

  return (
    <li className="bg-schedule-bg-grey rounded px-2.5 py-2">
      <div className="flex gap-3">
        <div className="text-heading w-24 shrink-0 text-xs font-bold">
          {formatRange(slot.start, slot.end)}
        </div>
        <div className="min-w-0">
          <div className="text-heading font-bold break-words">{slot.title}</div>
          {slot.location && (
            <div className="text-muted text-xs break-words">
              📍 {slot.location}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {slot.classmates.length === 0 && (
          <p className="text-muted text-xs italic">
            Nobody you know (who shares their schedule) is here.
          </p>
        )}

        {sameClass.length > 0 && (
          <div>
            <div className="text-muted mb-1 text-xs">
              In this class · {sameClass.length}
            </div>
            <Overflow
              items={sameClass}
              render={(c, i) => (
                <SameClassChip
                  key={`${c.id}-${i}`}
                  classmate={c}
                />
              )}
              wrapper={children => (
                <ul className="flex flex-wrap gap-1">{children}</ul>
              )}
            />
          </div>
        )}

        {busyElsewhere.length > 0 && (
          <div className="border-schedule-border-grey border-l-2 pl-2">
            <div className="text-muted mb-1 text-xs">
              Busy at the same time, not this class · {busyElsewhere.length}
            </div>
            <Overflow
              items={busyElsewhere}
              render={(c, i) => (
                <BusyRow
                  key={`${c.id}-${i}`}
                  classmate={c}
                />
              )}
              wrapper={children => <ul className="space-y-1.5">{children}</ul>}
            />
          </div>
        )}
      </div>
    </li>
  )
}

export function ClassmatesCard({ result }: CardProps) {
  const data = parseClassmates(result)

  if (!data) {
    return (
      <Card title="Classmates">
        <p>Couldn’t read the classmates data.</p>
      </Card>
    )
  }

  const { friendsChecked } = data
  const limitation = 'Only friends who share their schedule are checked'
  const caption =
    friendsChecked === 0
      ? 'None of your friends share their schedule, so nobody could be matched.'
      : `${limitation}${friendsChecked === null ? '' : ` (${plural(friendsChecked, 'friend')})`}. This is not the full class list.`

  return (
    <Card
      title="Classmates"
      subtitle={[
        data.date && formatDay(data.date),
        friendsChecked !== null &&
          `${plural(friendsChecked, 'friend')} checked`,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      {data.classes.length === 0 && <p>No classes on this day.</p>}
      <ul className="space-y-1.5">
        {data.classes.map((slot, i) => (
          <ClassBlock
            key={`${slot.start}-${slot.title}-${i}`}
            slot={slot}
          />
        ))}
      </ul>
      <p className="text-muted border-schedule-border-grey mt-3 border-t pt-2 text-xs">
        {caption}
      </p>
    </Card>
  )
}
