'use client'

import Image from 'next/image'

const companies = [
  { name: 'Amazon',           logo: '/logos/amazon.png' },
  { name: 'TikTok',           logo: '/logos/tiktok.png' },
  { name: 'Facebook',         logo: '/logos/facebook.png' },
  { name: 'Morgan Stanley',   logo: '/logos/morgan_stanley.png' },
  { name: 'Barclays',         logo: '/logos/barclays.png' },
  { name: 'Accenture',        logo: '/logos/accenture.png' },
  { name: 'Oportun',          logo: '/logos/oportun.png' },
  { name: 'JHU Medicine',     logo: '/logos/jhu_medicine.png' },
  { name: 'Maxim Group',      logo: '/logos/maxim_group.png' },
  { name: 'Amax Engineering', logo: '/logos/amax_engineering.png' },
]

// Duplicate for seamless infinite scroll
const doubled = [...companies, ...companies]

export default function CompanyLogos() {
  return (
    <section style={{ paddingTop: '48px', paddingBottom: '48px' }}>
      <div className="mx-auto" style={{ maxWidth: '1100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <p className="text-center" style={{ fontSize: '13px', color: '#6B7280', marginBottom: '32px' }}>
          导师来自全球顶级科技公司
        </p>
        <div style={{ overflow: 'hidden', maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
          <div className="logo-scroll" style={{ display: 'flex', alignItems: 'center', gap: '56px', width: 'max-content' }}>
            {doubled.map((c, i) => (
              <div key={`${c.name}-${i}`} style={{ flexShrink: 0, width: '100px', height: '32px', position: 'relative' }}>
                <Image
                  src={c.logo}
                  alt={c.name}
                  fill
                  sizes="100px"
                  style={{ objectFit: 'contain', opacity: 0.5, filter: 'grayscale(100%)' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes logo-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .logo-scroll {
          animation: logo-marquee 25s linear infinite;
        }
        .logo-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
