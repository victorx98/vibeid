import HeroSection from '@/components/landing/HeroSection'
import CompanyLogos from '@/components/landing/CompanyLogos'
import ATS2Section from '@/components/landing/ATS2Section'
import UploadSection from '@/components/landing/UploadSection'
import BeforeAfterResume from '@/components/landing/BeforeAfterResume'

export default function Home() {
  return (
    <main className="flex-1">
      {/* Navbar — sticky, 60px, white bg */}
      <header
        className="sticky top-0 z-50 bg-white"
        style={{ height: '60px', borderBottom: '1px solid #F3F4F6' }}
      >
        <div
          className="mx-auto flex items-center justify-between h-full"
          style={{ maxWidth: '1100px', paddingLeft: '24px', paddingRight: '24px' }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg" style={{ color: '#1A1A1A' }}>
              AI简历导师
            </span>
          </div>
          <a
            href="#upload"
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '14px' }}
          >
            开始使用
          </a>
        </div>
      </header>

      {/* Hero — white bg */}
      <div style={{ backgroundColor: '#ffffff' }}>
        <HeroSection />
      </div>

      {/* Company Logos — #F7F5EF bg */}
      <div style={{ backgroundColor: '#F7F5EF' }}>
        <CompanyLogos />
      </div>

      {/* ATS 2.0 — dark green bg, urgency section */}
      <ATS2Section />

      {/* Upload — white bg */}
      <div style={{ backgroundColor: '#ffffff' }}>
        <UploadSection />
      </div>

      {/* Before / After Resume Toggle */}
      <BeforeAfterResume />

      {/* Stats — dark forest green bg */}
      <section style={{ backgroundColor: '#0E2620', paddingTop: '96px', paddingBottom: '96px' }}>
        <div
          className="mx-auto grid grid-cols-3 gap-8 text-center"
          style={{ maxWidth: '1100px', paddingLeft: '24px', paddingRight: '24px' }}
        >
          <div>
            <div style={{ fontSize: '40px', fontWeight: 700, color: '#ffffff' }}>500+</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
              大厂导师
            </div>
          </div>
          <div>
            <div style={{ fontSize: '40px', fontWeight: 700, color: '#ffffff' }}>95%</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
              就业率
            </div>
          </div>
          <div>
            <div style={{ fontSize: '40px', fontWeight: 700, color: '#ffffff' }}>30,000+</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
              服务留学生
            </div>
          </div>
        </div>
      </section>

      {/* Trust & credibility — #F7F5EF bg */}
      <section style={{ backgroundColor: '#F7F5EF', paddingTop: '96px', paddingBottom: '96px' }}>
        <div
          className="mx-auto"
          style={{ maxWidth: '1100px', paddingLeft: '24px', paddingRight: '24px' }}
        >
          <div className="text-center" style={{ marginBottom: '48px' }}>
            <p className="section-label" style={{ marginBottom: '12px' }}>
              Powered by MentorX
            </p>
            <h2 className="h2-section" style={{ marginBottom: '16px' }}>
              10年真实辅导数据，全球独家
            </h2>
            <p className="body-text">
              蔓藤教育（MentorX）自2015年起深耕留学求职领域，累积了500+位大厂导师、30,000+场一对一辅导的真实反馈数据。我们的AI建议不是通用模板，而是从海量实战经验中提炼的精准洞察。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-light text-center">
              <h3
                className="font-semibold"
                style={{ color: '#1A1A1A', fontSize: '15px', marginBottom: '8px' }}
              >
                导师来自顶级企业
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.7 }}>
                Google、Amazon、Goldman Sachs、McKinsey等全球名企在职导师，覆盖北美、欧洲、中国
              </p>
            </div>
            <div className="card-light text-center">
              <h3
                className="font-semibold"
                style={{ color: '#1A1A1A', fontSize: '15px', marginBottom: '8px' }}
              >
                真实辅导数据驱动
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.7 }}>
                每条建议背后是10年、30,000+场真实辅导积累的成功模式，非AI凭空生成
              </p>
            </div>
            <div className="card-light text-center">
              <h3
                className="font-semibold"
                style={{ color: '#1A1A1A', fontSize: '15px', marginBottom: '8px' }}
              >
                精准匹配你的背景
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.7 }}>
                智能匹配行业、岗位、背景最相关的导师经验，针对CPT/OPT、H-1B等留学生场景优化
              </p>
            </div>
          </div>

          <div className="text-center" style={{ marginTop: '48px' }}>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
              获得美国 Top 30 名校认可
            </p>
            <div
              className="flex items-center justify-center flex-wrap"
              style={{
                gap: '40px',
                fontSize: '14px',
                color: '#6B7280',
                fontWeight: 500,
                opacity: 0.5,
              }}
            >
              <span>Columbia</span>
              <span>NYU</span>
              <span>Northwestern</span>
              <span>USC</span>
              <span>GWU</span>
              <span>+25 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer — white bg */}
      <footer
        style={{
          backgroundColor: '#ffffff',
          paddingTop: '32px',
          paddingBottom: '32px',
          borderTop: '1px solid #E5E7EB',
        }}
      >
        <div
          className="mx-auto text-center"
          style={{ maxWidth: '1100px', paddingLeft: '24px', paddingRight: '24px' }}
        >
          <div
            className="flex items-center justify-center gap-1.5"
            style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}
          >
            <span>Powered by</span>
            <span style={{ fontWeight: 700, color: '#1A1A1A' }}>Vibe ID&trade;</span>
          </div>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            &copy; 2026 AI简历导师 by MentorX &mdash; 让每份简历都有导师把关
          </p>
        </div>
      </footer>
    </main>
  )
}
