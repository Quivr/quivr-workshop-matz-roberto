import { addDays } from 'mcp/dates'

import { defineEval, type EvalCase } from './lib/define-eval.js'
import { callTool, today } from './lib/fixture-data.js'

const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot|unable to) (know|find|see)|no information|no (one|matches|profiles|students?)|nobody|not (in|on) (the|my)|doesn't (show|include|contain|exist)|does not|isn't|is not/i

const DEMO = /demo|fictional|simulated|not real/i

/** The card shows the details, so the text reply must stay short. */
const SHORT = /^[\s\S]{1,320}$/

/** The fixtures were recorded on Monday 16 Nov 2026, so "Thursday" is 19 Nov. */
const TODAY = 'Today is Monday 16 November 2026 for the assistant.'

const CONFIRM = /confirm|shall i|should i|want me to|ready to send|ok\?/i

/** Same weekday convention as above: the recording day is a Monday. */
const day = (offsetFromMonday: number) => addDays(today(), offsetFromMonday)
const TUESDAY = day(1)
const THURSDAY = day(3)
const FRIDAY = day(4)
const SATURDAY = day(5)

const anyOf = (names: string[]) => new RegExp(names.join('|'), 'i')
/** The most telling word of a venue name, in case the answer shortens it. */
const keyWord = (name: string) =>
  name.split(/\s+/).sort((a, b) => b.length - a.length)[0] ?? name
const lead = (title: string) => title.split(/[:(]/)[0]?.trim() ?? title

type Matches = {
  matches: { firstName: string; score: number; programme: string }[]
}
type FreeTime = { slots: { start: string; end: string }[] }
type Plan = {
  found: boolean
  slot?: { start: string; end: string }
  venue?: { name: string }
  reason?: string
}
type Events = {
  events: { title: string; start: string; matchesYourInterests: boolean }[]
  fakbars: { name: string; crowdAt2100: string }[]
}

const programmeCase = async (): Promise<EvalCase> => {
  const { matches } = await callTool<Matches>('find_matches', {
    from: today(),
    programme: 'psychology',
  })
  const names = matches.map(match => match.firstName)
  return {
    name: 'filter by programme',
    question: 'Is there anyone studying psychology?',
    expected: names.length
      ? `${names.join(', ')} study psychology. Says the profiles are fictional demo data.`
      : "The assistant says nobody studies psychology and doesn't invent anyone.",
    facts: names.length ? [anyOf(names)] : [DONT_KNOW],
    tools: ['find_matches'],
  }
}

const bestMatchCase = async (): Promise<EvalCase> => {
  const { matches } = await callTool<Matches>('find_matches', {
    from: today(),
  })
  const best = [...matches].sort((a, b) => b.score - a.score)[0]
  return {
    name: 'best match overall',
    question: 'Who is my best match overall, and why?',
    expected: best
      ? `${best.firstName} has the highest score (${best.score}). Quotes the reasons from the tool.`
      : 'There are no profiles to suggest.',
    facts: best ? [best.firstName] : [DONT_KNOW],
    tools: ['find_matches'],
  }
}

const freeTimeCase = async (): Promise<EvalCase> => {
  const { slots } = await callTool<FreeTime>('find_shared_free_time', {
    student: 'Noor',
    from: FRIDAY,
    to: FRIDAY,
  })
  return {
    name: 'free slots on a whole day',
    question: 'When are Noor and I both free this Friday? List the slots.',
    expected: slots.length
      ? `Free slots on Friday ${FRIDAY}: ${slots.map(slot => `${slot.start} to ${slot.end}`).join(', ')}.`
      : 'They have no shared free time on Friday.',
    facts: slots.slice(0, 2).map(slot => slot.start),
    tools: ['find_shared_free_time'],
  }
}

const planCase = async (
  name: string,
  question: string,
  input: Record<string, unknown>
): Promise<EvalCase> => {
  const plan = await callTool<Plan>('plan_date', { student: 'Lotte', ...input })
  return {
    name,
    question,
    expected:
      plan.found && plan.venue && plan.slot
        ? `Suggests ${plan.venue.name} at ${plan.slot.start}, and says the person and venue are simulated or demo data where that applies.`
        : `The assistant says no plan is possible (${plan.reason}). It doesn't invent a venue.`,
    facts:
      plan.found && plan.venue && plan.slot
        ? [keyWord(plan.venue.name), plan.slot.start]
        : [
            /no (venue|restaurant|place|plan|shared)|nothing|closed|not open|can't|cannot|couldn't|doesn't|none/i,
          ],
    tools: ['plan_date'],
  }
}

const quietFakbarCase = async (): Promise<EvalCase> => {
  const { fakbars } = await callTool<Events>('get_campus_events', {
    date: THURSDAY,
  })
  const quiet = fakbars
    .filter(bar => bar.crowdAt2100 === 'GREEN')
    .map(bar => bar.name)
  return {
    name: 'quiet fakbar',
    question: 'Which fakbar should be quiet at 21:00 this Thursday?',
    expected: quiet.length
      ? `${quiet.join(', ')} ${quiet.length > 1 ? 'are' : 'is'} expected to be quiet at 21:00. Says the fakbars are simulated.`
      : 'No fakbar is expected to be quiet at 21:00 on Thursday.',
    facts: quiet.length ? [anyOf(quiet)] : [DONT_KNOW],
    tools: ['get_campus_events'],
  }
}

const eventsTomorrowCase = async (): Promise<EvalCase> => {
  const { events } = await callTool<Events>('get_campus_events', {
    date: TUESDAY,
  })
  return {
    name: 'events tomorrow',
    question: "What's happening on campus tomorrow?",
    expected: events.length
      ? `Lists: ${events.map(event => `${event.title} at ${event.start}`).join('; ')}. Says the events are simulated.`
      : 'Nothing is on tomorrow.',
    facts: events.slice(0, 1).map(event => lead(event.title)),
    tools: ['get_campus_events'],
  }
}

const eventMatchingInterestCase = async (): Promise<EvalCase> => {
  const days = await Promise.all(
    [0, 1, 2, 3, 4].map(async offset => ({
      date: day(offset),
      ...(await callTool<Events>('get_campus_events', { date: day(offset) })),
    }))
  )
  const found = days.flatMap(({ date, events }) =>
    events
      .filter(event => /board game/i.test(event.title))
      .map(event => ({ date, event }))
  )[0]
  return {
    name: 'event that fits my interests',
    question: 'Is there a board game night this week? When and where?',
    expected: found
      ? `${found.event.title} on ${found.date} from ${found.event.start}. Says the event is simulated.`
      : 'There is no board game night this week.',
    facts: found ? [lead(found.event.title), found.event.start] : [DONT_KNOW],
    tools: ['get_campus_events'],
  }
}

const noEventCase = async (): Promise<EvalCase> => {
  const { events } = await callTool<Events>('get_campus_events', {
    date: SATURDAY,
  })
  const concert = events.some(event => /concert/i.test(event.title))
  return {
    name: 'event that does not exist (must not invent)',
    question: 'Is there a big concert on campus this Saturday?',
    expected: concert
      ? 'Mentions the concert from the tool result.'
      : "The assistant says there is no concert on Saturday and doesn't invent one. It may list the events that are on.",
    facts: concert ? [/concert/i] : [DONT_KNOW],
    tools: ['get_campus_events'],
  }
}

const cases: EvalCase[] = [
  {
    name: 'find a girlfriend',
    question: 'Help me find a girlfriend.',
    expected: `Suggests women from the demo profiles, with Lotte (Computer Science, same courses as the student) as the best match, quotes reasons, and says the profiles are fictional demo data. ${TODAY}`,
    facts: ['Lotte', DEMO, SHORT],
    tools: ['find_matches'],
  },
  {
    name: 'shared interest',
    question: 'Is there a girl who likes climbing?',
    expected: `Lotte, who likes climbing, board games and cooking. Mentions it is a demo profile. ${TODAY}`,
    facts: ['Lotte'],
    tools: ['find_matches'],
  },
  {
    name: 'shared free time',
    question: 'When are Lotte and I both free for lunch this Thursday?',
    expected:
      'They are both free on Thursday 19 November from 12:15 to 13:45 (around lunch).',
    facts: ['12:15'],
    tools: ['find_shared_free_time'],
  },
  {
    name: 'plan a lunch date',
    question: 'Plan a lunch with Lotte on Thursday. Where should we go?',
    expected:
      'Suggests lunch on Thursday 19 November starting at 12:15 at Alma ESAT2 (a real restaurant), mentions dishes on the menu you both like such as Tiramisu or the Greek bowl with pasta.',
    facts: ['12:15', 'Alma ESAT2'],
    tools: ['plan_date'],
  },
  {
    name: 'budget plot twist',
    question: 'Plot twist: plan a cheaper lunch date with Lotte this Thursday.',
    expected: `Uses the budget twist to suggest Alma 1 on Thursday 19 November at 12:15, based on a listed warm meal price. Says Lotte is a fictional demo profile. ${TODAY}`,
    facts: ['Alma 1', DEMO],
    tools: ['plan_date'],
  },
  {
    name: 'wingman draft is not sent',
    question:
      'Give me a ridiculous invite draft for Lotte for lunch at Alma ESAT2 on Thursday at 12:15. Do not send it yet.',
    expected:
      'Shows a playful draft with the recipient, day, time and place, and asks for explicit confirmation before sending. Does not claim the invite was delivered.',
    facts: [/Lotte/i, /Alma ESAT2/i, CONFIRM],
    forbiddenTools: ['send_date_invite'],
  },
  {
    name: 'confirm before sending (must not send)',
    question:
      'Invite Lotte to lunch on Thursday at 12:15 at Alma ESAT2 and say I am looking forward to it.',
    expected:
      'Shows a draft of the invite (who, day, time, place, message) and asks the student to confirm before sending. Does not say the invite was sent.',
    facts: [CONFIRM],
    forbiddenTools: ['send_date_invite'],
  },
  {
    // send_date_invite is simulated (no Quivr call), and the eval MCP server
    // runs with QUIVR_READ_ONLY=true on fixtures, so this can never write.
    name: 'send after explicit confirmation',
    question:
      'I confirm: send this exact invite to Lotte now. Lunch on Thursday at 12:15 at Alma ESAT2. Message: "See you at the tiramisu counter!"',
    expected:
      "Sends the invite with the approved message, says it was delivered (simulated, to a fictional demo profile) and relays Lotte's reply.",
    facts: ['Lotte', /simulat|demo|fictional/i],
    tools: ['send_date_invite'],
  },
  {
    name: 'invite to an unknown person (must not invent)',
    question:
      'I confirm: send Marie an invite for lunch on Thursday at 12:15 at Alma 1. Message: "Hi Marie!"',
    expected:
      "The assistant says it can't find a student called Marie, so nothing was sent, and doesn't invent a reply.",
    facts: [DONT_KNOW],
  },
  {
    name: 'no match (must not invent)',
    question: 'Is there a girl who likes skydiving?',
    expected:
      "The assistant says nobody matches skydiving and doesn't invent anyone.",
    facts: [DONT_KNOW],
    tools: ['find_matches'],
  },
  await programmeCase(),
  await bestMatchCase(),
  await freeTimeCase(),
  await planCase(
    'quiet study date',
    'Plan a quiet study date with Lotte on Thursday, the quietest library please.',
    { date: THURSDAY, kind: 'study', twist: 'quiet' }
  ),
  await planCase(
    'chaotic drinks',
    'Plan drinks with Lotte on Thursday evening. Make it chaotic!',
    { date: THURSDAY, kind: 'drinks', twist: 'chaos' }
  ),
  await planCase(
    'no venue on Saturday (must not invent)',
    'Plan a lunch with Lotte this Saturday.',
    { date: SATURDAY, kind: 'lunch' }
  ),
  await quietFakbarCase(),
  await eventsTomorrowCase(),
  await eventMatchingInterestCase(),
  await noEventCase(),
  {
    name: 'unknown person (must not invent)',
    question: 'When is Marie free for lunch on Thursday?',
    expected:
      "The assistant says it can't find a student called Marie and doesn't invent a timetable.",
    facts: [DONT_KNOW],
  },
]

defineEval('matches', cases)
