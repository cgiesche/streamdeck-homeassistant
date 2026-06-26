// In-memory ring buffer that captures recent console output so it can be
// included in the "Copy debug info" report from the Property Inspector.
// Install once at app startup (see pi/main.js) to wrap console.*.

const MAX_ENTRIES = 100
const entries = []
let installed = false

function format(arg) {
  if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg)
    } catch {
      return String(arg)
    }
  }
  return String(arg)
}

export function recordLog(level, args) {
  const message = args.map(format).join(' ')
  entries.push(`${new Date().toISOString()} [${level}] ${message}`)
  if (entries.length > MAX_ENTRIES) entries.shift()
}

export function getLogEntries() {
  return entries.slice()
}

export function installConsoleCapture() {
  if (installed) return
  installed = true
  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level].bind(console)
    console[level] = (...args) => {
      recordLog(level, args)
      original(...args)
    }
  }
}
