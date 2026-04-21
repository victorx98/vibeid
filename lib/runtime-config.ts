const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]
  if (value == null) return fallback
  return TRUE_VALUES.has(value.trim().toLowerCase())
}

export const demoUnlocksEnabled = readBooleanEnv(
  'NEXT_PUBLIC_DEMO_UNLOCKS_ENABLED',
  process.env.NODE_ENV !== 'production'
)

export const publicVibeSampleEnabled = readBooleanEnv(
  'NEXT_PUBLIC_ENABLE_VIBE_SAMPLE',
  process.env.NODE_ENV !== 'production'
)
