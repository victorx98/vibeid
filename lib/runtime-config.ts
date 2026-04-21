const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]
  if (value == null) return fallback
  return TRUE_VALUES.has(value.trim().toLowerCase())
}

// Demo unlocks only mint entitlements when the flag is explicitly set.
// Prior behaviour (default-on in non-production) could ship an unlocked build
// if NODE_ENV was mis-set at build time, since the value is baked into the
// client bundle via NEXT_PUBLIC_.
export const demoUnlocksEnabled = readBooleanEnv(
  'NEXT_PUBLIC_DEMO_UNLOCKS_ENABLED',
  false
)

// Static Vibe sample is off unless explicitly enabled. Middleware also 404s
// the /vibe-id-sample path when this is false.
export const publicVibeSampleEnabled = readBooleanEnv(
  'NEXT_PUBLIC_ENABLE_VIBE_SAMPLE',
  false
)

// Operational kill switch for billing. When on, mint endpoints return 503
// and no new entitlements can be issued regardless of mode.
export const billingKillSwitchEnabled = readBooleanEnv('BILLING_KILL_SWITCH', false)
