/**
 * Records and anonymises fixtures from the live backend (`just record-fixtures`).
 *
 * - Friend data goes through the allowlist in `createAnonymiser`, which also
 *   scrubs the friend ids in the fixture keys. Still check the files before
 *   committing: `scripts/fixtures-privacy.spec.ts` fails on obvious leaks.
 * - `MySchedule.json` is not purely recorded: days that come back empty are
 *   filled with fictional lessons (`fictional-lessons.ts`), because
 *   `get_classmates` and its evals need something to overlap with. Do not
 *   hand-edit those lessons in the JSON, change them in that file.
 * - Friends are capped at MAX_FIXTURE_FRIENDS, so `FriendList` and
 *   `FriendSchedules` stay consistent with each other.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { faker } from '@faker-js/faker'

import { FIXTURES_DIR, loadConfig } from '../src/config.js'
import { addDays, brusselsDate, datesBetween } from '../src/quivr/dates.js'
import { fixtureKey, writeFixtures } from '../src/quivr/fixtures.js'
import { QuivrClient } from '../src/quivr/quivr-client.js'
import { createAnonymiser, MAX_FIXTURE_FRIENDS } from './anonymise.js'
import { fillEmptyDays } from './fictional-lessons.js'

const DAYS_BEFORE = 2
const DAYS_AFTER = 13

faker.seed(42)
const anonymiser = createAnonymiser()
const recorded = new Map<string, Record<string, unknown>>()
const quivr = new QuivrClient({
  ...loadConfig(),
  mode: 'live',
  readOnly: true,
  onResponse: (operationName, variables, data) => {
    const entries = recorded.get(operationName) ?? {}
    recorded.set(operationName, {
      ...entries,
      [fixtureKey(anonymiser.variables(operationName, variables))]:
        anonymiser.response(operationName, data),
    })
  },
})

const recordedAt = new Date()
const today = brusselsDate(recordedAt)
const dates = datesBetween(
  addDays(today, -DAYS_BEFORE),
  addDays(today, DAYS_AFTER)
)

const { restaurants } = await quivr.listRestaurants()
await quivr.getLibraries()
for (const date of dates) {
  await quivr.getMySchedule(date)
  await Promise.all(restaurants.map(r => quivr.getMenu(r.id, date)))
}

// After every MySchedule day: friend titles and rooms are matched against it.
const { friendList } = await quivr.getFriends()
const friendIds = friendList.slice(0, MAX_FIXTURE_FRIENDS).map(f => f.id)
if (friendIds.length > 0) {
  for (const date of dates) await quivr.getFriendSchedules(friendIds, date)
}

for (const [operationName, recordedEntries] of recorded) {
  const entries =
    operationName === 'MySchedule'
      ? fillEmptyDays(recordedEntries, today)
      : recordedEntries
  writeFixtures(operationName, entries)
  console.info(`${operationName}: ${Object.keys(entries).length} responses`)
}
writeFileSync(
  join(FIXTURES_DIR, 'meta.json'),
  `${JSON.stringify({ recordedAt: recordedAt.toISOString(), days: dates }, null, 2)}\n`
)
console.info(
  `Recorded ${dates[0]} to ${dates.at(-1)}. Check the files in apps/mcp/fixtures for personal data before committing.`
)
