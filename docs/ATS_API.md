# 独立 ATS Score API

## 概述

`POST /api/ats/score` 是一个独立的简历 ATS 评分 API，可以被外部系统或前端应用调用。它提供了一个纯粹的简历评分能力，无需数据库依赖，可以轻松集成到其他项目中。

## 认证

支持两种认证方式（选其一）：

### 方式 1：API Key（推荐用于外部系统）

在请求头中提供 `x-api-key` header：

```bash
curl -X POST http://localhost:3000/api/ats/score \
  -H "Content-Type: application/json" \
  -H "x-api-key: <ATS_API_SECRET>" \
  -d '{...}'
```

**设置方法**：
1. 在 `.env.local` 或 `.env` 中设置 `ATS_API_SECRET`（32 字符及以上）
2. 生成安全的密钥：`openssl rand -hex 32`

### 方式 2：Supabase Session（用于前端用户）

使用现有的 Supabase 用户 session cookie 进行认证。前端应用会自动附加 session cookie。

## 请求格式

### URL
```
POST /api/ats/score
```

### 请求头
```
Content-Type: application/json
x-api-key: <ATS_API_SECRET>  // 或使用 Supabase session
```

### 请求体
```json
{
  "resumeText": "string (required, 10-50000 characters)",
  "targetRole": "string (required, 2-120 characters)",
  "jobDescription": "string (optional, max 20000 characters)"
}
```

**参数说明**：
- `resumeText`：简历文本内容（必须）
- `targetRole`：目标职位名称（必须）
- `jobDescription`：职位描述（可选）。如果提供，ATS 会针对具体 JD 进行关键词匹配

### 请求示例

#### 使用 API Key
```bash
curl -X POST http://localhost:3000/api/ats/score \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-secret-key-32-characters-1234567890" \
  -d '{
    "resumeText": "Senior Software Engineer with 8 years experience in Python and React",
    "targetRole": "Senior Software Engineer",
    "jobDescription": "We are looking for a Senior Engineer with React and Python skills"
  }'
```

#### 使用 JavaScript/fetch
```javascript
const response = await fetch('/api/ats/score', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-ats-api-secret'
  },
  body: JSON.stringify({
    resumeText: 'Senior Software Engineer...',
    targetRole: 'Senior Software Engineer'
  })
});

const result = await response.json();
console.log(`ATS Score: ${result.atsScore}`);
```

## 响应格式

### 成功响应（200 OK）
```json
{
  "atsScore": 72,
  "atsResult": {
    "ats_score": 72,
    "risk_level": "低",
    "scoring_context": "提供 JD",
    "dimension_scores": {
      "A_format_parsing": 18,
      "B_info_completeness": 16,
      "C_content_quality": 28,
      "D_keyword_matching": 10,
      "E_delivery_readiness": 8
    },
    "top_issues": [
      {
        "rank": 1,
        "severity": "high",
        "issue": "教育背景描述不足",
        "impact": "ATS 无法验证学历背景"
      }
    ],
    "priority_improvements": [
      {
        "rank": 1,
        "action": "添加教育背景（学校、学位、年份）",
        "expected_gain": "预计提升 5-8 分"
      }
    ],
    "strengths": [
      "工作经历结构清晰",
      "职位关键词覆盖充分"
    ]
  },
  "competition": {
    "job_title": "Senior Software Engineer",
    "estimated_applicants": 1000,
    "competition_tag": "中等竞争"
  }
}
```

### 错误响应

#### 400 Bad Request（请求参数不合法）
```json
{
  "error": "请求参数不合法，请检查简历文本和目标岗位后重试",
  "error_code": "invalid_request"
}
```

#### 401 Unauthorized（认证失败）
```json
{
  "error": "请提供有效的 API key（x-api-key header）或登录后再进行分析",
  "error_code": "unauthorized"
}
```

#### 429 Too Many Requests（速率限制）
```json
{
  "error": "请求过于频繁，请稍后再试",
  "error_code": "rate_limit_exceeded"
}
```

**Rate Limit 信息**在响应头中：
```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 195
X-RateLimit-Reset: 1673000000
Retry-After: 3600
```

#### 500 Internal Server Error
```json
{
  "error": "简历分析失败，请稍后重试",
  "error_code": "internal_error"
}
```

## ATS 评分维度

ATS 评分采用 100 分制，分为 5 个维度：

| 维度 | 权重 | 说明 |
|---|---|---|
| A - 解析与格式 (0-20) | 20% | 简历的排版、单列/双列、是否有表格/图片、日期一致性 |
| B - 信息完整性 (0-20) | 20% | 是否包含教育、经历、项目、技能等核心板块；地点、Bullet 密度 |
| C - 内容质量 (0-35) | 35% | 动作动词、结果导向、量化成果、证据具体性、表达专业度 |
| D - 关键词匹配 (0-15) | 15% | 与岗位 JD 的关键词覆盖率；若无 JD，则按通用方向估算（上限 13 分） |
| E - 投递完成度 (0-10) | 10% | 拼写语法、无重复、联系信息完整、整体成熟度 |

**总分 = (A + B + C + D + E)**

## 风险等级

| 等级 | 范围 | 含义 |
|---|---|---|
| 低 | ≥90 | 简历质量优秀，通过 ATS 筛选的可能性很高 |
| 中 | 60-89 | 简历有竞争力但存在明显短板，可通过改进提升成功率 |
| 高 | <60 | 简历存在重大问题，需要重点改善后才能有效投递 |

## 集成示例

### Python
```python
import requests

def analyze_resume(resume_text, target_role, api_key):
    response = requests.post(
        'http://localhost:3000/api/ats/score',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': api_key
        },
        json={
            'resumeText': resume_text,
            'targetRole': target_role
        }
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API Error: {response.text}")

# 使用
result = analyze_resume(
    resume_text="Senior Software Engineer...",
    target_role="Senior Software Engineer",
    api_key="your-api-secret"
)
print(f"ATS Score: {result['atsScore']}/100")
```

### Node.js
```javascript
async function analyzeResume(resumeText, targetRole, apiKey) {
  const response = await fetch('http://localhost:3000/api/ats/score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      resumeText,
      targetRole
    })
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// 使用
const result = await analyzeResume(
  'Senior Software Engineer...',
  'Senior Software Engineer',
  'your-api-secret'
);
console.log(`ATS Score: ${result.atsScore}/100`);
```

## 性能与稳定性

- **响应时间**：8-15 秒（因为需要调用 Claude API）
- **超时设置**：20 秒，会自动重试 2 次
- **Rate Limit**：200 次请求/小时（按 IP 地址统计）
- **并发**：建议不超过 5 并发请求，避免超时

## 常见问题

### Q: API key 应该怎么生成？
A: 使用 `openssl rand -hex 32` 生成一个随机的 32 字节十六进制字符串，设置为 `ATS_API_SECRET` 环境变量。

### Q: 可以在没有 JD 的情况下评分吗？
A: 可以。不提供 `jobDescription` 的话，ATS 会按通用方向估算，关键词维度（D）的上限是 13 分而非 15 分。

### Q: 为什么某些请求返回 500 错误？
A: 可能原因：
- Claude API 暂时不可用
- 请求的简历文本过长或格式异常
- 网络连接问题

建议重试或检查输入数据。

### Q: ATS Score 和其他简历评分工具有什么区别？
A: 本 ATS 系统基于真实的企业 ATS 筛选逻辑，强调：
- 关键词精确匹配（特别是有 JD 时）
- 量化成果证明
- 简历结构与格式规范性
- 不考虑学校/公司品牌（避免偏见）

## 部署与集成

### 本地开发
```bash
# 1. 设置环境变量
echo "ATS_API_SECRET=$(openssl rand -hex 32)" >> .env.local

# 2. 启动开发服务器
npm run dev

# 3. 测试 API
curl -X POST http://localhost:3000/api/ats/score \
  -H "Content-Type: application/json" \
  -H "x-api-key: $(grep ATS_API_SECRET .env.local | cut -d'=' -f2)" \
  -d '{"resumeText":"...", "targetRole":"..."}'
```

### 生产环境部署
1. 生成安全的 `ATS_API_SECRET`：`openssl rand -hex 32`
2. 在部署平台（Vercel、Docker 等）中设置环境变量
3. 确保 API 密钥不被泄露到客户端
4. 考虑迁移 rate limiter 到 Redis/Upstash KV（当前实现是进程内的）

## 安全建议

- ✅ 使用强随机密钥（≥32 字符）
- ✅ 通过 HTTPS 传输 API 密钥
- ✅ 不要将 API 密钥硬编码在前端代码中
- ✅ 定期轮换 API 密钥
- ✅ 监控 rate limit 告警，检测滥用
- ⚠️ 当前 rate limiter 是进程内 Map，多容器部署时需迁移至 Redis
