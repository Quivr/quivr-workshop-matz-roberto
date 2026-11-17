import { z } from 'zod'

import { DEMO_NOTE } from '../demo/matching.js'
import { findStudent } from '../demo/students.js'
import { dateSchema, defineTool } from './define-tool.js'

export const sendDateInvite = defineTool({
  name: 'send_date_invite',
  description:
    "Send a meet-up invite to one demo student. THIS SENDS A MESSAGE: first show the student a draft (who, day, time, place and the exact message) and only call this tool after they explicitly confirm, then set confirmed to true. The recipient is fictional and the message is simulated (nothing is sent through Quivr), but treat it like a real one. Returns the delivery status and the demo student's reply.",
  inputSchema: {
    student: z.string().describe('First name or id from find_matches'),
    date: dateSchema.describe('Day, YYYY-MM-DD'),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Use HH:MM')
      .describe('Start time, HH:MM'),
    place: z.string().describe('Where, e.g. "Alma 3"'),
    message: z
      .string()
      .min(1)
      .max(280)
      .describe('The message the student approved'),
    confirmed: z
      .boolean()
      .describe('Must be true, and only after the student confirmed the draft'),
  },
  run: async ({ student: query, date, time, place, message, confirmed }) => {
    if (!confirmed) {
      throw new Error(
        'Not confirmed. Show the student the draft and ask for confirmation first.'
      )
    }
    const student = findStudent(query)
    if (!student) throw new Error(`No demo student called "${query}"`)
    const day = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`))

    return {
      demo: true,
      note: DEMO_NOTE,
      simulated: true,
      status: 'delivered',
      to: student.firstName,
      when: `${date} ${time}`,
      where: place,
      message,
      photoUrl: student.photoUrl,
      reply: student.reply
        .replace('{when}', `${day}, ${time}`)
        .replace('{where}', place),
    }
  },
})
