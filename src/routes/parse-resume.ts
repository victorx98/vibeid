import type { FastifyInstance } from 'fastify'

import { extractCandidateEmail } from '../../lib/email'
import { logError, logInfo, logWarn } from '../../lib/logger'
import { RATE_LIMITS, checkRateLimit, createRateLimitHeaders } from '../../lib/rate-limit'
import {
  MAX_RESUME_UPLOAD_BYTES,
  getResumeUploadKind,
  hasExpectedFileSignature,
  isAllowedResumeMime,
  isSupportedResumeUploadKind,
} from '../../lib/validation'

export default async function parseResumeRoutes(app: FastifyInstance): Promise<void> {
  app.post('/parse-resume', async (request, reply) => {
    const rateLimit = checkRateLimit(request, RATE_LIMITS.upload)
    reply.headers(createRateLimitHeaders(rateLimit))

    if (!rateLimit.allowed) {
      return reply.code(429).send({ error: '上传过于频繁，请稍后再试' })
    }

    try {
      const uploaded = await request.file()
      if (!uploaded) {
        return reply.code(400).send({ error: '未检测到上传文件' })
      }

      const fileKind = getResumeUploadKind(uploaded.filename)
      if (!fileKind) {
        return reply.code(400).send({ error: '请上传 PDF 或 DOCX 格式的简历' })
      }

      if (!isSupportedResumeUploadKind(fileKind)) {
        return reply
          .code(400)
          .send({ error: '暂不支持旧版 .doc 文件，请另存为 .docx 或 PDF 后重试' })
      }

      const buffer = await uploaded.toBuffer()

      if (buffer.byteLength > MAX_RESUME_UPLOAD_BYTES) {
        return reply.code(413).send({ error: '文件过大，请上传 10MB 以内的 PDF 或 DOCX 简历' })
      }

      if (uploaded.file.truncated) {
        return reply.code(413).send({ error: '文件过大，请上传 10MB 以内的 PDF 或 DOCX 简历' })
      }

      if (!isAllowedResumeMime(fileKind, uploaded.mimetype)) {
        return reply.code(415).send({ error: '文件类型与扩展名不匹配，请重新导出后再上传' })
      }

      if (!hasExpectedFileSignature(fileKind, buffer)) {
        logWarn('resume_signature_mismatch', {
          fileKind,
          mimeType: uploaded.mimetype || 'unknown',
          fileName: uploaded.filename,
          size: buffer.byteLength,
        })
        return reply.code(415).send({ error: '文件内容校验失败，请重新导出简历后再上传' })
      }

      let text = ''
      let pageCount = 1

      if (fileKind === 'pdf') {
        const { extractText } = await import('unpdf')
        const { text: pdfPages, totalPages } = await extractText(new Uint8Array(buffer))
        text = Array.isArray(pdfPages) ? pdfPages.join('\n') : String(pdfPages)
        pageCount = totalPages
      } else {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        text = result.value
      }

      const trimmed = text.trim()
      if (trimmed.length < 10) {
        return reply
          .code(400)
          .send({ error: '无法从文件中提取文本内容，请确认简历包含可复制文字' })
      }

      logInfo('resume_parsed', {
        fileKind,
        pageCount,
        uploadBytes: buffer.byteLength,
        extractedChars: trimmed.length,
      })

      return reply.send({
        text: trimmed,
        pageCount,
        candidateEmail: extractCandidateEmail(trimmed),
      })
    } catch (error) {
      logError('resume_parse_failed', error)
      return reply.code(500).send({ error: '简历解析失败，请稍后重试' })
    }
  })
}
