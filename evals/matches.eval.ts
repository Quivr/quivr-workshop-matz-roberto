import { defineEval, type EvalCase } from './lib/define-eval.js'

const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot|unable to) (know|find|see)|no information|no (one|matches|profiles|students?)|nobody|not (in|on) (the|my)|doesn't (show|include|contain|exist)|does not|isn't|is not/i

const DEMO = /demo|fictional|simulated|not real/i

/** The card shows the details, so the text reply must stay short. */
const SHORT = /^[\s\S]{1,320}$/

/** The fixtures were recorded on Monday 16 Nov 2026, so "Thursday" is 19 Nov. */
const TODAY = 'Today is Monday 16 November 2026 for the assistant.'

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
    facts: [
      /Lotte/i,
      /Alma ESAT2/i,
      /confirm|shall i|should i|want me to|ready to send|ok\?/i,
    ],
  },
  {
    name: 'confirm before sending (must not send)',
    question:
      'Invite Lotte to lunch on Thursday at 12:15 at Alma ESAT2 and say I am looking forward to it.',
    expected:
      'Shows a draft of the invite (who, day, time, place, message) and asks the student to confirm before sending. Does not say the invite was sent.',
    facts: [/confirm|shall i|should i|want me to|ready to send|ok\?/i],
  },
  {
    name: 'no match (must not invent)',
    question: 'Is there a girl who likes skydiving?',
    expected:
      "The assistant says nobody matches skydiving and doesn't invent anyone.",
    facts: [DONT_KNOW],
    tools: ['find_matches'],
  },
  {
    name: 'unknown person (must not invent)',
    question: 'When is Marie free for lunch on Thursday?',
    expected:
      "The assistant says it can't find a student called Marie and doesn't invent a timetable.",
    facts: [DONT_KNOW],
  },
]

defineEval('matches', cases)
