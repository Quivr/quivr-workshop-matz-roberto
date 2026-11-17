import { dateSchema, defineTool } from './define-tool.js'

type Item = {
  title: string
  startTime: string
  endTime: string
  locations?: { name?: string | null }[] | null
}

const locationOf = (item: Item): string | null =>
  item.locations
    ?.map(location => location.name)
    .filter(Boolean)
    .join(', ') || null

const normalise = (text: string | null) => text?.trim().toLowerCase() ?? null

const overlaps = (a: Item, b: Item) =>
  new Date(a.startTime).getTime() < new Date(b.endTime).getTime() &&
  new Date(b.startTime).getTime() < new Date(a.endTime).getTime()

const isSameClass = (mine: Item, theirs: Item) => {
  if (normalise(mine.title) !== normalise(theirs.title)) return false
  const [a, b] = [normalise(locationOf(mine)), normalise(locationOf(theirs))]
  return a === null || b === null || a === b
}

const displayName = (friend: { firstName: string; lastName: string }) => {
  const initial = friend.lastName.trim().charAt(0)
  return initial ? `${friend.firstName} ${initial}.` : friend.firstName
}

export const getClassmates = defineTool({
  name: 'get_classmates',
  description:
    "Find which of the student's friends have something scheduled at the same time as the student's own classes and events on one day. Quivr has no class roster: this only covers friends who share their schedule, so never present the result as a full list of who is in a class. Each of the student's items is returned with the overlapping friends; `isSameClass` is true when the title (and the location, when both are known) matches, so it is likely the same class. `friendsChecked` is how many friends have at least one visible item that day: 0 means no friend shares anything that day, so say you don't know who is there.",
  inputSchema: {
    date: dateSchema.describe('The day to look at, YYYY-MM-DD'),
  },
  run: async ({ date }, quivr) => {
    const [mine, { friendList }] = await Promise.all([
      quivr.getMySchedule(date),
      quivr.getFriends(),
    ])
    const friendSchedules = friendList.length
      ? (
          await quivr.getFriendSchedules(
            friendList.map(friend => friend.id),
            date
          )
        ).friendSchedules
      : []

    const friends = new Map(friendList.map(friend => [friend.id, friend]))
    const shared = friendSchedules
      .map(schedule => ({
        friend: friends.get(schedule.friendId),
        items: schedule.scheduleItems.filter(item => !item.allDay),
      }))
      .filter(entry => entry.friend && entry.items.length > 0)

    const classes = mine.scheduleItems.scheduleItems
      .map(item => ({ item, start: new Date(item.startTime).getTime() }))
      .sort((a, b) => a.start - b.start)
      .map(({ item }) => {
        const classmates = shared.flatMap(({ friend, items }) => {
          const matches = items
            .filter(other => overlaps(item, other))
            .map(other => ({
              id: friend!.id,
              name: displayName(friend!),
              isSameClass: isSameClass(item, other),
              title: other.title,
              start: other.startTime,
              end: other.endTime,
              location: locationOf(other),
            }))
            .sort((a, b) => Number(b.isSameClass) - Number(a.isSameClass))
          return matches.slice(0, 1)
        })
        return {
          title: item.title,
          start: item.startTime,
          end: item.endTime,
          location: locationOf(item),
          classmates: classmates.sort(
            (a, b) =>
              Number(b.isSameClass) - Number(a.isSameClass) ||
              a.name.localeCompare(b.name)
          ),
        }
      })

    return { date, friendsChecked: shared.length, classes }
  },
})
