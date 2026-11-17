# Quivr data deep dive: what we can use to match students

As of 17 Nov 2026. Sources: the schema snapshot (`apps/mcp/src/quivr/schema.json`), the recorded fixtures (`apps/mcp/fixtures/`), and the Rails backend (`quivr/Backend`: resolvers, `Ability`, `Friendship::*`, `Schedule::GetFriendSchedules`, `Targeting::*`). Nothing here was run against the live API, so field availability for a given account is _unverified_ until we try it.

Legend: ✅ available to us as a normal user · 🔒 real, but only for friends or with permission · ❌ not exposed by the API (simulate it) · 👑 only for Quivr members/partners (see privacy section, we should not use it)

## TL;DR

1. **About ourselves we know a lot:** courses, lessons, degree, favourite dishes, restaurant, library and fakbar, diet and allergens, study-interest categories.
2. **About other students we know almost nothing.** `OtherUser` exposes only `id`, `firstName`, `lastName` and `mutualFriends`. There is no programme, no courses, no favourites, no age, no gender, no bio.
3. **The one rich channel is `friendSchedules`**, and only for accepted friends. Times are always visible. Lesson titles (which is how we would infer shared courses) and locations only appear if that friend granted the `TITLE` / `LOCATION` permission.
4. **The campus context is excellent and real:** menus and prices, opening hours, library occupancy, fakbar busyness, events with going/interested counts. This is where "date planning" gets its value.
5. **Real stranger-matching is not possible with the current API**, and that is a deliberate privacy design (friends-only schedules, `hiddenInFriends` defaults to `true`). So for a demo we **simulate the people and keep the places real**.

## 1. Data inventory

### People and social graph

| Signal                                 | Me        | Friends         | Strangers                                                                                                                    | Where                                                                                                    |
| -------------------------------------- | --------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Name, id                               | ✅ `user` | ✅ `friendList` | 🔒 `findFriend(query)`, only users who turned off `hiddenInFriends`. It defaults to **true**, so most users are not findable | `OtherUser { id firstName lastName }`                                                                    |
| Mutual friends                         | –         | ✅              | ✅                                                                                                                           | `OtherUser.mutualFriends` (connection)                                                                   |
| Suggestions                            | ✅        | –               | ✅                                                                                                                           | `friendSuggestions`: friends-of-friends who share **2 or more** friends with you, excluding hidden users |
| Photo, age, gender, bio, "looking for" | ❌        | ❌              | ❌                                                                                                                           | Does not exist in the schema                                                                             |

### Academic

| Signal                                                           | Me  | Friends                                | Strangers | Where                                                                                                   |
| ---------------------------------------------------------------- | --- | -------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| Lessons (title, time, room, teachers)                            | ✅  | 🔒 title/room only with permission     | ❌        | `scheduleItems` (already used by `get_my_schedule`)                                                     |
| Courses I follow                                                 | ✅  | ❌ (only inferable from lesson titles) | ❌        | `schedules(types: [LESSON_SCHEDULE]) { courses { name courseParts { name } } }`. Not yet in our queries |
| Degree, institution                                              | ✅  | ❌                                     | ❌        | `user { settings { degree institution } }` (`degree` is a nullable string)                              |
| Study-interest categories                                        | ✅  | ❌                                     | ❌        | `user { categories { id name parentId } }`                                                              |
| Programme tree (faculty → programme → course leaf with `phases`) | 👑  | 👑                                     | 👑        | `node`, `childNodes`, `ancestorNodes` (members only)                                                    |
| "How many students match programme X"                            | 👑  | 👑                                     | 👑        | `nodesUserCount(nodes, phases, nbCourses)`: counts only                                                 |

### Time

| Signal                  | Me  | Friends                                                                                                                                  | Strangers                | Where                                                                                                                    |
| ----------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Busy/free blocks        | ✅  | 🔒 always visible for accepted friends                                                                                                   | ❌ `scheduleItems: null` | `friendSchedules(friendIds, timeRange) { friendId scheduleItems { title startTime endTime allDay locations { name } } }` |
| What counts as visible  |     | Lessons in **selected** groups, non-private events, imported event specs. `title` is `''` and `locations` is `[]` without the permission |                          | `Schedule::GetFriendSchedules`                                                                                           |
| Friend permission flags | –   | ❌ not readable, only writable (`editFriendPermissions`)                                                                                 | –                        | `FriendshipPermissionEnum { TITLE LOCATION }`                                                                            |

### Food

| Signal                                             | Me  | Friends | Strangers | Where                                                                                      |
| -------------------------------------------------- | --- | ------- | --------- | ------------------------------------------------------------------------------------------ |
| Menus, prices, veg/vegan, allergens, meal category | ✅  | –       | –         | `restaurants { dishes(timeRange) }`. Real data in our fixtures                             |
| Opening hours                                      | ✅  | –       | –         | `restaurants { openingHours(timeRange) }`                                                  |
| Favourite dishes, restaurant, library, fakbar      | ✅  | ❌      | ❌        | `user { settings { favoriteDishes favRestaurant favLibrary favFakbar } }`, `Dish.favorite` |
| Diet (veggie, vegan, allergens)                    | ✅  | ❌      | ❌        | `user { settings { veggie vegan allergens } }`                                             |

### Places and events

| Signal                                               | Scope           | Where                                                                                      |
| ---------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| Library occupancy, capacity, opening hours           | ✅ everyone     | `libraries { data { occupancy capacity } openingHours }`                                   |
| Fakbar busyness (`GREEN`, `YELLOW`, `RED`, `CLOSED`) | ✅ everyone     | `fakbars(onlyShowOpen) { name fakbarData { busyness } }`                                   |
| Event feed: title, time, place, tags, organisers     | ✅ everyone     | `eventSpecificationsFeed`, `eventSpecification(id)`                                        |
| How many are going or interested                     | ✅ counts       | `EventSpecification.interestCount`                                                         |
| **Which friends** are going or interested            | 🔒 friends only | `interestedFriends`, `importingFriends`                                                    |
| Invite someone to an event                           | mutation        | `createEvent`, `createEventInvites`. Needs `QUIVR_READ_ONLY=false` and a confirmation step |

### What our recorded fixtures contain today

| Fixture            | Content                                                                                                                                                                                | Matching value                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `Restaurants.json` | 10 Alma restaurants (ids 1 to 8, 40, 41)                                                                                                                                               | Real, use as-is                                                            |
| `Menu.json`        | 10 restaurants × 16 days (14 to 29 Nov 2026), about 3,860 dish entries, 167 unique dishes. Includes veg/vegan/allergens. **No `favorite` field**, because our query does not select it | Real, use as-is                                                            |
| `Libraries.json`   | 32 libraries and faculty sites with capacity and a single occupancy snapshot                                                                                                           | Real, use as-is. Many are not study spaces (admin offices, ICT)            |
| `MySchedule.json`  | **Empty for all 16 days (0 items)**                                                                                                                                                    | The recorded account has no lessons. We must simulate a schedule for demos |

## 2. What the API cannot tell us, and how we would still match

| We want to match on            | Real signal                                      | What we can honestly derive                             | What we simulate                    |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------------- | ----------------------------------- |
| Same programme / faculty       | Only our own `degree`                            | Our own programme                                       | Their programme                     |
| Same courses                   | Lesson titles of friends with `TITLE` permission | Overlap between my courses and a friend's lesson titles | Course lists of non-friends         |
| Shared free time               | Friends' busy blocks                             | Gaps in both schedules for friends                      | Schedules of non-friends            |
| Shared taste in food           | Only our own favourite dishes                    | Dishes on tomorrow's menu that I like                   | Their favourite dishes              |
| Shared study spot              | Only our own `favLibrary`                        | A library that is open and not full now                 | Their favourite library             |
| Shared events                  | Counts, plus friends going                       | Events where friends or mutual friends are going        | Events strangers are going to       |
| Social proof                   | `mutualFriends`, `friendSuggestions`             | Strangers with at least 2 shared friends                | –                                   |
| Interests, "type", age, gender | Nothing                                          | Nothing                                                 | Everything (if we want them at all) |

## 3. Matching ideas that use real Quivr data

Each idea uses real data for **places and times** and (where the API stops) simulated data for **people**.

1. **Shared free slot.** Merge my `scheduleItems` and their schedule, take the gaps between 08:00 and 22:00, and return slots of 60 minutes or more, ranked by closeness to lunch or dinner.
2. **Lunch date.** For a shared slot, find restaurants whose `openingHours` cover it, then rank them by how many dishes on that day's menu match both people's favourites and diets (`vegetarian`, `vegan`, `allergens`). Output: "Alma 3, Thursday 12:30, both like the vegetarian lasagne".
3. **Study date.** Same programme or same course plus a shared free slot, then suggest the library that is open, has a low `occupancy / capacity` ratio, and is near the shared lesson location.
4. **Evening date.** Shared free evening plus an open fakbar with `busyness` of `GREEN` or `YELLOW`, or an event from the feed that both marked `INTERESTED`.
5. **Course buddy.** Overlap on course names (real for friends with `TITLE`, simulated otherwise).
6. **Friends of friends.** `friendSuggestions` (at least 2 shared friends) is the only real "stranger" signal. Use it for warm introductions ("you both know Anna and Tim").

A simple, explainable score (the assistant must always say _why_):

```
score = 3 × sharedCourses + 2 × sameProgramme + 2 × sharedFreeSlots(≥60 min, next 7 days)
      + 1 × sharedFavouriteDishes + 1 × sameFavouriteLibrary + 2 × mutualFriends
```

## 4. Privacy findings (read before building)

These came out of reading the backend and change what we should build.

1. **`hiddenInFriends` defaults to `true`.** `findFriend` only returns users who opted in. Real users are mostly unfindable. A matching feature that reaches strangers would need a new, opt-in "open to meeting people" flag.
2. **Strangers have no schedule.** `friendSchedules` returns `scheduleItems: null` for non-friends. Titles and rooms are blanked unless the friend granted `TITLE` / `LOCATION`. Real matching on timetables is therefore friends-only today.
3. **Member-only calls can leak, so we must not use them for matching.** The workshop doc says test accounts are made "Quivr members". Members can call:
   - `findFriend(allUsers: true)`: bypasses `hiddenInFriends`.
   - `targets { matches(userId) }`: tells you whether **any user id** matches a target, which can encode "in programme X with at least N courses".
   - `nodesUserCount`: counts only, which is fine.
     Using the first two to profile real students would defeat the consent model. Keep them out of the tools and add this to the rules.
4. **Sensitive attributes.** Gender and orientation are not in Quivr and we should not add them as inferred data. Our current `find_matches` demo has a `gender` field. It is fine for invented people. A real version should rely on what students opt into.
5. **Read-only first.** Inviting someone (`createEventInvites`) is a write. The prompt rule "show a draft and wait for confirmation" already covers it, and `QUIVR_READ_ONLY=true` blocks it by default.

## 5. "Lying a bit": a simulated student directory

Since the API does not expose other students' details, we invent them. To keep this honest and easy to remove:

- **Fake only what the API does not expose.** People and their attributes: programme, courses, weekly timetable, favourite dishes, library and restaurant, interests. Everything about **places** (menus, hours, occupancy, busyness, events) stays real, so suggestions are actually bookable.
- **Link the fiction to real entities.** Use real restaurant ids/names (Alma 3, Alma Groep T, …) and real library names from `Libraries.json`, and pick a faculty-appropriate pair (e.g. Engineering Technology ↔ Alma Groep T and "Faculty of Engineering Technology – Campus Groep T"). Otherwise cross-links such as "both like X at Alma 3" break.
- **Label it everywhere.** Keep the `demo: true` flag and the note in tool output, and have the assistant say which parts are simulated.
- **One seam.** Put everything in a single module (today `fake-profiles.ts`) behind the same shape a real API would return, so replacing it later is one file.
- **Simulate "me" too, for fixtures.** The recorded schedule is empty, so add a fictional student with a weekly timetable (a fixture file or a small generator) so schedule matching can be demoed and evaluated.

Suggested shape for a simulated student:

```ts
type DemoStudent = {
  id: string
  firstName: string
  programme: string // e.g. 'Engineering Technology'
  faculty: string // maps to a real library/restaurant
  courses: string[] // real-sounding course names
  timetable: {
    day: 1 | 2 | 3 | 4 | 5
    start: string
    end: string
    course: string
  }[]
  favouriteDishes: string[] // names that exist in Menu.json
  favouriteRestaurantId: string // real id
  favouriteLibraryId: string // real id
  diet?: 'vegetarian' | 'vegan'
  interests: string[]
  mutualFriends: number
}
```

Rule of thumb for dish names: pick them **from `Menu.json`** so a "shared favourite dish" can actually be found on the menu on a given day.

## 6. Proposed work (nothing built yet)

Following "Add a tool end to end" in `AGENTS.md`:

| Step | What                                                                                                     | Notes                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1    | Queries `MySettings` (favourites, degree, diet), `MyCourses`, `Fakbars`, `FriendList`, `FriendSchedules` | One `.graphql` file each, then `just gql-gen`. Add `favorite` to the `Menu` query |
| 2    | Simulated directory `demo-students.ts` and a simulated "me" timetable                                    | Behind one interface, flagged `demo`                                              |
| 3    | `find_shared_free_time(person, from, to)`                                                                | Gaps in two schedules                                                             |
| 4    | `plan_date(person, slot)`                                                                                | Opening hours + menus + library occupancy + fakbar busyness                       |
| 5    | Upgrade `find_matches`                                                                                   | Score from section 3, returns reasons, no gender filter by default                |
| 6    | Tests, 3 to 5 evals (include "answer not in the data"), optional card                                    | Evals use fixtures, so the simulated "me" timetable is a prerequisite             |
| 7    | Rule in `AGENTS.md`: no `allUsers`, no `targets.matches`, no `nodesUserCount` for matching               | See privacy findings                                                              |

## 7. Things to ask the Quivr team

- Is `Settings` for other users intended to stay private? Is there a plan for an opt-in "meet people" profile (programme, interests, availability)?
- Can friends' `FriendshipPermission` be read, so the assistant can say "Anna hasn't shared her lesson titles" instead of showing blanks?
- Is `Target.matches(userId)` meant to be callable for arbitrary users by members?
- Are `Lesson.private` and `LessonSchedule.private` honoured in `friendSchedules`? The model validates `private` as `false` for lesson schedules, and the friend query does not filter on it, so we believe lessons are always visible to friends subject to permissions (_unverified_).

## 8. Status: the fictional world is built

We went with "fake the people, keep the places real". Everything lives in `apps/mcp/src/demo/` and is behind the same MCP tools as the real ones.

| File               | What it holds                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `demo/students.ts` | The logged-in student (`demoMe`, Computer Science at Arenberg) and 12 fictional students: programme, courses, weekly timetable, favourite dishes, restaurant, library and fakbar, interests, bio, icebreaker, fun facts, mutual friends and what they reply to an invite |
| `demo/world.ts`    | Map areas of Leuven, real restaurant and library ids mapped to areas, 6 invented fakbars with a crowd model, and a weekly programme of 9 invented events                                                                                                                 |
| `demo/schedule.ts` | Time helpers: busy blocks, free gaps with a 15 minute travel buffer                                                                                                                                                                                                      |
| `demo/matching.ts` | Explainable scoring (courses, programme, dishes, library, restaurant, interests, mutual friends, shared lunch slots)                                                                                                                                                     |

| Tool                                         | Real data                         | Simulated data                                                       |
| -------------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `find_matches`                               | My schedule (7 days)              | People, scores                                                       |
| `find_shared_free_time`                      | My schedule                       | Their timetable                                                      |
| `plan_date` (lunch, dinner)                  | Restaurants, opening hours, menus | Person, favourites                                                   |
| `plan_date` (study)                          | Library occupancy                 | Person, favourites                                                   |
| `plan_date` (drinks) and `get_campus_events` | Nothing                           | Fakbars, crowd, events, who goes                                     |
| `send_date_invite`                           | Nothing (sends nothing)           | The whole delivery and the reply. Refuses unless `confirmed` is true |

Things to know:

- **Date extras:** `plan_date` now returns a three-step meet-cute mission and three exact invite drafts (sweet, absurd, low-key). Its `twist` input supports `budget` for meals, `quiet` for study spots and `chaos` for drinks. The date card can reroll a plan or place a draft in the composer; sending still requires a separate confirmation.
- **Occupancy limits:** the quiet study choice uses the latest recorded occupancy, which is not a forecast for the selected date. The current library query does not include opening hours, so the plan says that they were not checked.
- **My schedule is fake too.** The recorded account had no lessons, so `scripts/fake-schedule.ts` writes the `demoMe` timetable into `fixtures/MySchedule.json` (run `yarn workspace mcp fake-schedule`; `record-fixtures` runs it automatically). `get_my_schedule` and the matching tools therefore agree.
- **Consistency is tested.** `demo/demo.spec.ts` checks that every favourite dish exists on the recorded menus, every restaurant and library id exists in the fixtures, and that timetables never overlap.
- **Dates:** fixtures cover 14 to 29 Nov 2026, so tools only work for those days in `QUIVR_MODE=fixtures`. Timetables repeat weekly, so live mode works for any date.
- **Evals:** `evals/matches.eval.ts` has 7 cases (find, filter, free time, plan, confirm-before-send, two "must not invent"). They need `ANTHROPIC_API_KEY`, which is empty in `.env` right now, so they have not been run.
