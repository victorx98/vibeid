'use client'

import Image from 'next/image'
import { useState } from 'react'

// Map company names/companyLogo values to local logo filenames in /public/logos/
const LOCAL_LOGOS: Record<string, string> = {
  amazon: '/logos/amazon.png',
  facebook: '/logos/facebook.png',
  'polarr/facebook': '/logos/facebook.png',
  polarr: '/logos/polarr.png',
  tiktok: '/logos/tiktok.png',
  'morgan stanley': '/logos/morgan_stanley.png',
  morganstanley: '/logos/morgan_stanley.png',
  oportun: '/logos/oportun.png',
  'oportun financial': '/logos/oportun.png',
  barclays: '/logos/barclays.png',
  accenture: '/logos/accenture.png',
  ey: '/logos/ey.png',
  intuit: '/logos/intuit.png',
  'jhu medicine': '/logos/jhu_medicine.png',
  jhumedicine: '/logos/jhu_medicine.png',
  'maxim group': '/logos/maxim_group.png',
  maximgroup: '/logos/maxim_group.png',
  'amax engineering': '/logos/amax_engineering.png',
  amaxengineering: '/logos/amax_engineering.png',
}

// Clearbit fallback for companies not in local logos
const CLEARBIT_DOMAINS: Record<string, string> = {
  google: 'google.com',
  meta: 'meta.com',
  apple: 'apple.com',
  microsoft: 'microsoft.com',
  bytedance: 'bytedance.com',
  tencent: 'tencent.com',
  alibaba: 'alibaba.com',
  goldman: 'goldmansachs.com',
  jpmorgan: 'jpmorgan.com',
  mckinsey: 'mckinsey.com',
  deloitte: 'deloitte.com',
  salesforce: 'salesforce.com',
  uber: 'uber.com',
  airbnb: 'airbnb.com',
  linkedin: 'linkedin.com',
  stripe: 'stripe.com',
  netflix: 'netflix.com',
  nvidia: 'nvidia.com',
  adobe: 'adobe.com',
  spotify: 'spotify.com',
  walmart: 'walmart.com',
  intel: 'intel.com',
  tesla: 'tesla.com',
}

function getLogoSrc(company: string): string | null {
  const lower = company.toLowerCase().trim()

  // 1. Exact match in local logos
  if (LOCAL_LOGOS[lower]) return LOCAL_LOGOS[lower]

  // 2. Fuzzy match in local logos (check if company contains key or key contains company)
  for (const [key, path] of Object.entries(LOCAL_LOGOS)) {
    if (lower.includes(key) || key.includes(lower)) return path
  }

  // 3. Clearbit domain match
  const stripped = lower.replace(/[^a-z]/g, '')
  if (CLEARBIT_DOMAINS[stripped]) {
    return `https://logo.clearbit.com/${CLEARBIT_DOMAINS[stripped]}`
  }
  for (const [key, domain] of Object.entries(CLEARBIT_DOMAINS)) {
    if (stripped.includes(key) || key.includes(stripped)) {
      return `https://logo.clearbit.com/${domain}`
    }
  }

  // 4. Try clearbit with guessed domain
  return `https://logo.clearbit.com/${stripped}.com`
}

export default function CompanyLogo({ company, size = 48 }: { company: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const logoSrc = getLogoSrc(company)
  const initial = company.charAt(0).toUpperCase()

  if (failed || !logoSrc) {
    return (
      <div
        className="rounded-xl flex items-center justify-center font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: '#F0F7F2', color: '#2A6041' }}
      >
        {initial}
      </div>
    )
  }

  return (
    <div
      className="shrink-0 rounded-xl overflow-hidden bg-white flex items-center justify-center"
      style={{ width: size, height: size, border: '1px solid #E5E7EB' }}
    >
      <Image
        src={logoSrc}
        alt={company}
        width={size}
        height={size}
        className="object-contain p-1"
        onError={() => setFailed(true)}
        unoptimized
      />
    </div>
  )
}
