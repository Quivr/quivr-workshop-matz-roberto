import { spawn } from 'node:child_process'
import { watch } from 'node:fs'

import { QUERIES_DIR } from '../src/config.js'

/**
 * Regenerate the GraphQL types whenever a query changes.
 * `tsx watch` only follows imports, and the .graphql files are read at runtime,
 * so nothing else notices when you add or edit an operation.
 */
const DEBOUNCE_MS = 250

let timer: NodeJS.Timeout | undefined
let running = false
let queued = false

const codegen = () => {
  if (running) {
    queued = true
    return
  }
  running = true
  spawn('yarn', ['codegen'], { stdio: 'inherit' }).on('close', () => {
    running = false
    if (queued) {
      queued = false
      codegen()
    }
  })
}

const schedule = (filename: string | null) => {
  if (filename && !filename.endsWith('.graphql')) return
  clearTimeout(timer)
  timer = setTimeout(codegen, DEBOUNCE_MS)
}

codegen()
watch(QUERIES_DIR, (_event, filename) => schedule(filename))
console.info(`Watching ${QUERIES_DIR} for .graphql changes`)
