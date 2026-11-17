import type { DemoStudent } from './students.js'

export type DateKind = 'lunch' | 'dinner' | 'study' | 'drinks'
export type DateTwist = 'budget' | 'quiet' | 'chaos'

type DateExtrasInput = {
  student: DemoStudent
  date: string
  start: string
  kind: DateKind
  venue: string
  menuPick?: string
}

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))

const activity = (kind: DateKind) =>
  ({
    lunch: 'grab lunch',
    dinner: 'get dinner',
    study: 'study together',
    drinks: 'grab drinks',
  })[kind]

const activityName = (kind: DateKind) =>
  ({ lunch: 'lunch', dinner: 'dinner', study: 'studying', drinks: 'drinks' })[
    kind
  ]

/** Playful copy assembled only from this plan and the fictional profile. */
export const dateExtras = ({
  student,
  date,
  start,
  kind,
  venue,
  menuPick,
}: DateExtrasInput) => {
  const whereAndWhen = `${venue} on ${dayLabel(date)} at ${start}`
  const sideQuest = menuPick
    ? `See whether ${menuPick} deserves its own fan club. It is on that day's menu.`
    : kind === 'study'
      ? `Take a five-minute break and debate this hot take: ${student.funFacts.hotTake}`
      : `Ask ${student.firstName} to defend this hot take: ${student.funFacts.hotTake}`

  return {
    mission: [
      { title: 'The rendezvous', text: `Meet at ${whereAndWhen}.` },
      { title: 'Side quest', text: sideQuest },
      { title: 'Final boss: first line', text: student.icebreaker },
    ],
    inviteDrafts: [
      {
        tone: 'sweet',
        message: `Hey ${student.firstName}, would you like to ${activity(kind)} with me at ${whereAndWhen}? I'd love to spend some time together.`,
      },
      {
        tone: 'absurd',
        message: `Important campus experiment: can two people enjoy ${activityName(kind)} at ${venue}? Join me on ${dayLabel(date)} at ${start} and we'll publish our findings.`,
      },
      {
        tone: 'low-key',
        message: `Hey ${student.firstName}, fancy ${activityName(kind)} at ${whereAndWhen}? No pressure 🙂`,
      },
    ],
  }
}
