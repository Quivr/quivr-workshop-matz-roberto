import { Card } from './Card'
import type { CardProps } from './types'

type Student = {
  id: string
  firstName: string
  lastName: string
  name: string
  email: string
}

const initials = (student: Student) =>
  `${student.firstName.at(0) ?? ''}${student.lastName.at(0) ?? ''}`.toUpperCase()

export function StudentCard({ result }: CardProps) {
  const student = result as Student

  return (
    <Card
      title="Student card"
      subtitle="Quivr"
    >
      <div className="border-schedule-border-grey flex items-center gap-3 rounded border p-3">
        <div className="bg-main font-title text-sidenav-blue flex size-14 shrink-0 items-center justify-center rounded-full text-2xl tracking-wide">
          {initials(student)}
        </div>
        <div className="min-w-0">
          <div className="font-title text-heading text-2xl tracking-wide">
            {student.name}
          </div>
          <div className="text-main-text truncate text-xs">{student.email}</div>
          <div className="text-main-text text-xs opacity-70">
            Quivr id {student.id}
          </div>
        </div>
      </div>
    </Card>
  )
}
