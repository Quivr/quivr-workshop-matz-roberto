import { faker } from '@faker-js/faker'

const PERSON_KEYS = new Set(['firstName', 'lastName', 'email', 'uid'])
const DROPPED_KEYS = new Set(['notes', 'comments'])
export const FICTIONAL_STUDENT = {
  id: '1001',
  firstName: 'Alex',
  lastName: 'Student',
  email: 'alex.student@example.com',
}

export const FICTIONAL_FIRST_NAMES = [
  'Lotte',
  'Max',
  'Nina',
  'Jules',
  'Sam',
  'Robin',
  'Noor',
  'Kai',
]
export const FICTIONAL_LAST_NAMES = [
  'Voorbeeld',
  'Mockdata',
  'Nepnaam',
  'Testpersoon',
  'Fictief',
  'Placeholder',
  'Dummy',
  'Sample',
]
/** Friends kept in the fixtures: one fictional name pair each. */
export const MAX_FIXTURE_FRIENDS = FICTIONAL_FIRST_NAMES.length
export const FICTIONAL_FRIEND_ID = /^9\d{3}$/
export const FICTIONAL_PLACE = /^Fictional place \d+$/

export const PRIVATE_EVENT_TITLES = [
  'Study session',
  'Sports',
  'Group project',
  'Lunch with friends',
]

const fakePerson = (key: string): string => {
  if (key === 'firstName') return faker.person.firstName()
  if (key === 'lastName') return faker.person.lastName()
  return faker.internet.email().toLowerCase()
}

/**
 * Replaces personal data with fake data, keeping the structure.
 * Public data (restaurants, libraries, course names, rooms) is kept.
 */
export const anonymise = (value: unknown, parentKey = ''): unknown => {
  if (Array.isArray(value)) return value.map(item => anonymise(item, parentKey))
  if (value === null || typeof value !== 'object') return value

  const record = value as Record<string, unknown>
  const isTeacher = parentKey === 'teachers'
  const isPersonalEvent =
    typeof record.__typename === 'string' && record.__typename !== 'Lesson'

  return Object.fromEntries(
    Object.entries(record).map(([key, field]) => {
      if (PERSON_KEYS.has(key) && typeof field === 'string') {
        return [key, fakePerson(key)]
      }
      if (DROPPED_KEYS.has(key)) return [key, null]
      if (isTeacher && key === 'name') return [key, faker.person.fullName()]
      if (isPersonalEvent && key === 'title') {
        return [key, faker.helpers.arrayElement(PRIVATE_EVENT_TITLES)]
      }
      return [key, anonymise(field, key)]
    })
  )
}

type Row = Record<string, unknown>
const rows = (value: unknown): Row[] => (Array.isArray(value) ? value : [])

/**
 * Anonymises whole responses, with state shared across operations so a friend
 * is the same fake person in `FriendList` and `FriendSchedules`.
 *
 * Friend payloads have no `__typename` and no way to tell a lesson from a
 * private event, so they are rebuilt from an allowlist of fields (anything
 * unknown is dropped) and keyed off the operation name. A friend's title or
 * place survives only when it is a lesson or room from the student's own
 * schedule (public course data); everything else gets a fictional stand-in.
 * Record `MySchedule` before `FriendSchedules` so those lessons are known.
 */
export const createAnonymiser = () => {
  const friends = new Map<string, { id: string; index: number }>()
  const lessonTitles = new Set<string>()
  const lessonPlaces = new Set<string>()
  const titles = new Map<string, string>()
  const places = new Map<string, string>()

  const friend = (realId: string) => {
    const known = friends.get(realId)
    if (known) return known
    const index = friends.size
    const created = { id: String(9001 + index), index }
    friends.set(realId, created)
    return created
  }

  const title = (real: string) => {
    if (lessonTitles.has(real)) return real
    const fake =
      titles.get(real) ??
      PRIVATE_EVENT_TITLES[titles.size % PRIVATE_EVENT_TITLES.length]!
    titles.set(real, fake)
    return fake
  }

  const place = (real: unknown) => {
    if (typeof real !== 'string') return null
    if (lessonPlaces.has(real)) return real
    const fake = places.get(real) ?? `Fictional place ${places.size + 1}`
    places.set(real, fake)
    return fake
  }

  const learnLessons = (data: unknown) => {
    const items = (data as { scheduleItems?: { scheduleItems?: unknown } })
      ?.scheduleItems?.scheduleItems
    for (const item of rows(items)) {
      if (item.__typename !== 'Lesson') continue
      if (typeof item.title === 'string') lessonTitles.add(item.title)
      for (const location of rows(item.locations)) {
        if (typeof location.name === 'string') lessonPlaces.add(location.name)
      }
    }
  }

  const friendList = (data: unknown) => ({
    friendList: rows((data as { friendList?: unknown })?.friendList)
      .slice(0, MAX_FIXTURE_FRIENDS)
      .map(row => {
        const { id, index } = friend(String(row.id))
        return {
          id,
          firstName: FICTIONAL_FIRST_NAMES[index],
          lastName: FICTIONAL_LAST_NAMES[index],
        }
      }),
  })

  const friendSchedules = (data: unknown) => ({
    friendSchedules: rows(
      (data as { friendSchedules?: unknown })?.friendSchedules
    ).map(schedule => ({
      friendId: friend(String(schedule.friendId)).id,
      scheduleItems: rows(schedule.scheduleItems).map((item, position) => ({
        id: `friend-item-${position + 1}`,
        title: title(String(item.title)),
        startTime: item.startTime,
        endTime: item.endTime,
        allDay: item.allDay,
        locations: rows(item.locations).map(location => ({
          name: place(location.name),
        })),
      })),
    })),
  })

  return {
    response: (operationName: string, data: unknown): unknown => {
      if (operationName === 'FriendList') return friendList(data)
      if (operationName === 'FriendSchedules') return friendSchedules(data)
      if (operationName === 'MySchedule') learnLessons(data)
      return anonymise(data)
    },
    /** Request variables end up in the fixture key, so they need scrubbing too. */
    variables: (operationName: string, variables: object): object => {
      if (operationName !== 'FriendSchedules') return variables
      const { friendIds, ...rest } = variables as {
        friendIds: string[]
      } & object
      return { ...rest, friendIds: friendIds.map(id => friend(id).id) }
    },
  }
}
