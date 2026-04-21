import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const scanRoots = ['.next/static', 'public']
const blockedPatterns = [
  'anthropic-dangerous-direct-browser-access',
  'window.ANTHROPIC_API_KEY',
  '"x-api-key"',
  "'x-api-key'",
]

function* walk(dirPath) {
  for (const entry of readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      yield* walk(fullPath)
      continue
    }

    yield fullPath
  }
}

const violations = []

for (const root of scanRoots) {
  const fullRoot = path.join(process.cwd(), root)
  if (!existsSync(fullRoot)) continue

  for (const filePath of walk(fullRoot)) {
    const content = readFileSync(filePath, 'utf8')
    for (const pattern of blockedPatterns) {
      if (content.includes(pattern)) {
        violations.push({ filePath, pattern })
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Blocked client-side secret patterns found:')
  for (const violation of violations) {
    console.error(`- ${violation.pattern} in ${path.relative(process.cwd(), violation.filePath)}`)
  }
  process.exit(1)
}

console.log('No blocked client-side secret patterns found.')
