import { Buffer } from 'node:buffer'

import { NextRequest } from 'next/server'

import { extractCandidateEmail } from '@/lib/email'
import { logError, logInfo, logWarn } from '@/lib/logger'
import {
  RATE_LIMITS,
  checkRateLimit,
  createRateLimitHeaders,
} from '@/lib/rate-limit'
import {
  MAX_RESUME_UPLOAD_BYTES,
  getResumeUploadKind,
  hasExpectedFileSignature,
  isAllowedResumeMime,
  isSupportedResumeUploadKind,
} from '@/lib/validation'

export const runtime = 'nodejs'

const MAX_MULTIPART_BODY_BYTES = MAX_RESUME_UPLOAD_BYTES + 64 * 1024

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, RATE_LIMITS.upload)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: '上传过于频繁，请稍后再试' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    )
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BODY_BYTES) {
    return Response.json(
      { error: '文件过大，请上传 10MB 以内的 PDF 或 DOCX 简历' },
      { status: 413, headers: createRateLimitHeaders(rateLimit) }
    )
  }

  try {
    const formData = await request.formData()
    const uploaded = formData.get('file')

    if (!(uploaded instanceof File)) {
      return Response.json(
        { error: '未检测到上传文件' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    const fileKind = getResumeUploadKind(uploaded.name)
    if (!fileKind) {
      return Response.json(
        { error: '请上传 PDF 或 DOCX 格式的简历' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    if (!isSupportedResumeUploadKind(fileKind)) {
      return Response.json(
        { error: '暂不支持旧版 .doc 文件，请另存为 .docx 或 PDF 后重试' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    if (uploaded.size > MAX_RESUME_UPLOAD_BYTES) {
      return Response.json(
        { error: '文件过大，请上传 10MB 以内的 PDF 或 DOCX 简历' },
        { status: 413, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    if (!isAllowedResumeMime(fileKind, uploaded.type)) {
      return Response.json(
        { error: '文件类型与扩展名不匹配，请重新导出后再上传' },
        { status: 415, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    const buffer = Buffer.from(await uploaded.arrayBuffer())
    if (!hasExpectedFileSignature(fileKind, buffer)) {
      logWarn('resume_signature_mismatch', {
        fileKind,
        mimeType: uploaded.type || 'unknown',
        fileName: uploaded.name,
        size: uploaded.size,
      })

      return Response.json(
        { error: '文件内容校验失败，请重新导出简历后再上传' },
        { status: 415, headers: createRateLimitHeaders(rateLimit) }
      )
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
      return Response.json(
        { error: '无法从文件中提取文本内容，请确认简历包含可复制文字' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    logInfo('resume_parsed', {
      fileKind,
      pageCount,
      uploadBytes: uploaded.size,
      extractedChars: trimmed.length,
    })

    return Response.json(
      { text: trimmed, pageCount, candidateEmail: extractCandidateEmail(trimmed) },
      { headers: createRateLimitHeaders(rateLimit) }
    )
  } catch (error) {
    logError('resume_parse_failed', error)
    return Response.json(
      { error: '简历解析失败，请稍后重试' },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    )
  }
}
