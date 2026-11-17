import { defineTool } from './define-tool.js'

export const getStudentCard = defineTool({
  name: 'get_student_card',
  description:
    "Get the signed-in student's own student card: their Quivr id, first and last name and email. Use it for 'who am I', 'what is my name/email' or 'show my student card' questions. It never returns data about anyone else.",
  inputSchema: {},
  run: async (_input, quivr) => {
    const { user } = await quivr.getStudentCard()
    if (!user) throw new Error('Not signed in to Quivr, no student card.')

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
    }
  },
})
