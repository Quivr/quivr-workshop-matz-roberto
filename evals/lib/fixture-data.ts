import { addDays, brusselsDate } from 'mcp/dates'
import { QuivrClient } from 'mcp/quivr-client'
import { tools } from 'mcp/tools'

import { fixturesNow } from './run.js'

/**
 * Reads the same recorded fixtures the agent sees, so expected answers are
 * computed from the data instead of hard-coded. Re-recording keeps evals valid.
 */
export const fixtures = new QuivrClient({
  mode: 'fixtures',
  readOnly: true,
  baseUrl: '',
})

/**
 * Runs a read-only MCP tool in-process on the fixtures: exactly the data the
 * agent sees, so expected answers follow the tools and the recordings.
 * Never use it for a tool that writes: send_date_invite is refused here.
 */
export const callTool = async <T>(
  name: string,
  input: Record<string, unknown>
): Promise<T> => {
  if (name === 'send_date_invite')
    throw new Error('Evals never run send_date_invite in-process')
  const tool = tools.find(candidate => candidate.name === name)
  if (!tool) throw new Error(`Unknown tool ${name}`)
  return (await tool.run(input as never, fixtures)) as T
}

export const today = () => brusselsDate(fixturesNow())
export const tomorrow = () => addDays(today(), 1)

export const findRestaurant = async (name: string) => {
  const { restaurants } = await fixtures.listRestaurants()
  const restaurant =
    restaurants.find(r => r.name.toLowerCase().includes(name.toLowerCase())) ??
    restaurants[0]
  if (!restaurant) throw new Error('No restaurants in the fixtures')
  return restaurant
}

export const upcomingItems = async () => {
  const now = fixturesNow().toISOString()
  const days = await Promise.all(
    [0, 1, 2, 3, 4, 5, 6].map(offset =>
      fixtures.getMySchedule(addDays(today(), offset))
    )
  )
  return days
    .flatMap(day => day.scheduleItems.scheduleItems)
    .filter(item => new Date(item.endTime).toISOString() > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export const timeOf = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
  }).format(new Date(iso))
