'use client'

const dangerItems = [
  {
    icon: '✗',
    label: '关键词堆砌',
    desc: 'AI 直接判定为垃圾信息，你甚至不会进入人工审核环节',
  },
  {
    icon: '✗',
    label: 'AI 生成模板',
    desc: 'ATS 2.0 内置检测器，识别精度超过人类 HR，一键过滤',
  },
  {
    icon: '✗',
    label: '双栏 / 表格排版',
    desc: '解析直接失败，你的学历、经历可能全部丢失，HR 看到一片空白',
  },
]

const ruleItems = [
  {
    num: '01',
    title: 'Value Proposition 价值主张',
    desc: 'AI 寻找你能为公司带来什么，而非你有多少年经验',
    full: false,
  },
  {
    num: '02',
    title: 'X-Y-Z 量化数据法则',
    desc: 'Google 推崇的 XYZ 格式是 AI 评分的黄金标准——没有数字等于没有故事',
    full: false,
  },
  {
    num: '03',
    title: 'Skills-First 核心技能置顶',
    desc: '导师告诉你岗位真正需要哪些技能，AI 帮你把它们置顶——3 秒锁定注意力',
    full: false,
  },
  {
    num: '04',
    title: '语义关键词整合',
    desc: 'ATS 2.0 具备 NLU 能力，识别意图而非词汇列表。导师的行业洞察让你写出 AI 读得懂、HR 信得过的表达',
    full: false,
  },
  {
    num: '05',
    title: '深度链接作品集 × Vibe ID — AI 可爬取的一键真实证明',
    desc: 'ATS 2.0 会主动爬取简历链接验证真实性。你的 Vibe ID 就是答案——GitHub、Notion、LinkedIn 整合为一个链接，让 AI 和 HR 同时看见你的全部实力，无法造假，无需解释。',
    full: true,
  },
]

const mentorItems = [
  {
    label: 'AI 优化逻辑',
    desc: '格式、语义、关键词——精准命中 ATS 规则，不触发任何过滤器',
  },
  {
    label: '导师填充灵魂',
    desc: '真实的行业技能视角与人类经验，让简历有"人味"，通过 AI 生成感检测',
  },
  {
    label: 'Vibe ID 验证真实',
    desc: '深度链接背书，AI 爬取可查，真实性是最强的竞争壁垒',
  },
]

export default function ATS2Section() {
  return (
    <section style={{ backgroundColor: '#0E2620', paddingTop: '96px', paddingBottom: '96px' }}>
      <div
        className="mx-auto"
        style={{ maxWidth: '1100px', paddingLeft: '24px', paddingRight: '24px' }}
      >
        {/* ── Section header ── */}
        <div className="text-center" style={{ marginBottom: '56px' }}>
          <p
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#C6E04B',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            ATS 2.0 时代
          </p>

          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 52px)',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.15,
              marginBottom: '24px',
            }}
          >
            97% 的企业已用{' '}
            <span
              style={{
                color: '#C6E04B',
                textDecoration: 'underline',
                textDecorationColor: 'rgba(198,224,75,0.35)',
                textDecorationThickness: '3px',
                textUnderlineOffset: '6px',
              }}
            >
              AI
            </span>{' '}
            筛简历
            <br />
            你的简历，能过关吗？
          </h2>

          <p
            style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.6)',
              maxWidth: '580px',
              margin: '0 auto',
              lineHeight: 1.75,
            }}
          >
            招聘底层逻辑已彻底变革。旧方法不仅无效，
            <br className="hidden md:block" />
            还会主动触发 AI 淘汰机制——0.3 秒，没有第二次机会。
            <br />
            <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              唯一的解法：用 AI 优化逻辑，用导师经验填充灵魂。
            </span>
          </p>
        </div>

        {/* ── Danger cards ── */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{ marginBottom: '72px' }}
        >
          {dangerItems.map((item) => (
            <div
              key={item.label}
              style={{
                backgroundColor: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '16px',
                padding: '28px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239,68,68,0.15)',
                  color: '#F87171',
                  fontWeight: 700,
                  fontSize: '16px',
                  marginBottom: '16px',
                }}
              >
                {item.icon}
              </div>
              <h3
                style={{
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '15px',
                  marginBottom: '8px',
                }}
              >
                {item.label}
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── Pivot divider ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '48px',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#C6E04B',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            新规则：让 AI 主动推荐你
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* ── Rules grid (2-col, last card full-width) ── */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          style={{ marginBottom: '56px' }}
        >
          {ruleItems.map((rule) => (
            <div
              key={rule.num}
              className={rule.full ? 'md:col-span-2' : ''}
              style={{
                backgroundColor: rule.full ? 'rgba(198,224,75,0.07)' : '#1A3D32',
                border: rule.full ? '1px solid rgba(198,224,75,0.3)' : '1px solid #2D5A47',
                borderRadius: '16px',
                padding: '28px',
                display: 'flex',
                gap: '20px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#C6E04B',
                  letterSpacing: '0.05em',
                  flexShrink: 0,
                  paddingTop: '2px',
                }}
              >
                {rule.num}
              </span>
              <div>
                <h3
                  style={{
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '15px',
                    marginBottom: '8px',
                  }}
                >
                  {rule.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── MentorX value prop ── */}
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '40px 36px',
            marginBottom: '56px',
          }}
        >
          <p
            style={{
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: '#C6E04B',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}
          >
            为什么 MentorX 是唯一真正的解法
          </p>
          <p
            style={{
              textAlign: 'center',
              fontSize: '20px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '36px',
              lineHeight: 1.4,
            }}
          >
            AI 工具给你逻辑，MentorX 给你灵魂
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mentorItems.map((item) => (
              <div
                key={item.label}
                style={{
                  backgroundColor: '#1A3D32',
                  border: '1px solid #2D5A47',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#C6E04B',
                    marginBottom: '10px',
                  }}
                >
                  {item.label}
                </div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <p
            style={{
              textAlign: 'center',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.35)',
              marginTop: '24px',
            }}
          >
            纯 AI 工具只能做到第一点。只有 MentorX 三者兼备。
          </p>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="text-center">
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '20px',
              letterSpacing: '0.03em',
            }}
          >
            ✓ 完全免费&ensp;&ensp;✓ 30 秒出结果&ensp;&ensp;✓ 无需注册
          </p>
          <a
            href="#upload"
            style={{
              display: 'inline-block',
              backgroundColor: '#C6E04B',
              color: '#0E2620',
              padding: '14px 40px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '16px',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.88')}
            onMouseOut={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
          >
            立刻免费检测我的简历 →
          </a>
        </div>
      </div>
    </section>
  )
}
