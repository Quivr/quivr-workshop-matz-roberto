import { stdin, stdout } from 'node:process'
import { Writable } from 'node:stream'
import { createInterface } from 'node:readline/promises'

import { credentialsFrom, loadConfig } from '../src/config.js'
import { updateEnvFile } from './env-file.js'

type LoginResponse = {
  success?: boolean
  need_otp?: boolean
  errors?: string[]
  data?: { user?: { email?: string }; access_token?: string; client?: string }
}

type LoginResult = LoginResponse & { authorization: string | null }

const ask = async (question: string, hidden = false): Promise<string> => {
  // Readline echoes through this stream, so muting it hides typing completely.
  let muted = false
  const output = new Writable({
    write(chunk, _encoding, done) {
      if (!muted) stdout.write(chunk)
      done()
    },
  })
  const rl = createInterface({ input: stdin, output, terminal: true })
  rl.once('SIGINT', () => {
    stdout.write('\n')
    process.exit(130)
  })
  const answer = rl.question(question)
  muted = hidden
  try {
    return (await answer).trim()
  } finally {
    rl.close()
    if (hidden) stdout.write('\n')
  }
}

const login = async (body: Record<string, string>): Promise<LoginResult> => {
  const response = await fetch(`${loadConfig().baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await response.json().catch(() => ({}))) as LoginResponse
  return { ...json, authorization: response.headers.get('authorization') }
}

if (!stdin.isTTY) {
  console.error('`just login` needs an interactive terminal.')
  process.exit(1)
}

const { baseUrl } = loadConfig()
console.info(
  `Log in to Quivr (${baseUrl}). Your password is only sent to Quivr.`
)
const email = await ask('Email: ')
const password = await ask('Password: ', true)

let result = await login({ email, password })
if (result.success === false && result.need_otp) {
  const otp = await ask('One-time code: ', true)
  result = await login({ email, password, otp_attempt: otp })
}

const values = {
  QUIVR_AUTHORIZATION: result.authorization ?? '',
  QUIVR_UID: result.data?.user?.email ?? '',
  QUIVR_CLIENT: result.data?.client ?? '',
  QUIVR_ACCESS_TOKEN: result.data?.access_token ?? '',
}
if (result.success === false || !credentialsFrom(values)) {
  console.error(
    `\nLogin failed: ${result.errors?.join(', ') ?? 'no token in the response'}`
  )
  process.exit(1)
}

updateEnvFile(values)
console.info(
  '\nLogged in. Token saved to .env. Run `just logout` when you are done.'
)
