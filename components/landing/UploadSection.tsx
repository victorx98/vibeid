'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/client-api'
import { setCurrentArtifactId, waitForJob } from '@/lib/client-artifacts'
import { MAX_RESUME_UPLOAD_BYTES } from '@/lib/constants'
import { ensureSupabaseSession } from '@/lib/supabase/browser'
import LoadingScreen from '@/components/shared/LoadingScreen'

export default function UploadSection() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [targetRole, setTargetRole] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingStage, setLoadingStage] = useState<'parsing' | 'analyzing'>('parsing')
  const [analyzeCompleted, setAnalyzeCompleted] = useState(false)
  const [completedArtifactId, setCompletedArtifactId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const handleFile = useCallback((f: File) => {
    const ext = f.name.toLowerCase()
    if (!ext.endsWith('.pdf') && !ext.endsWith('.docx')) {
      setError('请上传 PDF 或 DOCX 文件')
      return
    }

    if (f.size > MAX_RESUME_UPLOAD_BYTES) {
      setError('文件过大，请上传 10MB 以内的 PDF 或 DOCX 简历')
      return
    }

    setError('')
    setFile(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  async function handleSubmit() {
    if (!file || !targetRole.trim()) {
      setError('请上传简历并输入目标岗位')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      // Step 1: Parse resume
      setLoadingStage('parsing')
      const formData = new FormData()
      formData.append('file', file)
      const parseRes = await fetch('/api/parse-resume', { method: 'POST', body: formData })
      if (!parseRes.ok) throw new Error(await getApiErrorMessage(parseRes, '简历解析失败'))
      const { text } = await parseRes.json()

      // Step 2: Persist artifact + enqueue analysis
      setLoadingStage('analyzing')
      await ensureSupabaseSession()
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          resumeText: text,
          targetRole: targetRole.trim(),
          jobDescription: jobDescription.trim() || undefined,
        }),
      })
      if (!analyzeRes.ok) throw new Error(await getApiErrorMessage(analyzeRes, '分析失败'))
      const { jobId, artifactId } = await analyzeRes.json()
      setCurrentArtifactId(artifactId)
      setCompletedArtifactId(artifactId)
      await waitForJob(jobId)

      // Animate bar to 100%, then navigate via onCompleted callback
      setAnalyzeCompleted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败，请重试')
      setIsProcessing(false)
    }
  }

  if (isProcessing) return (
    <LoadingScreen
      stage={loadingStage}
      completed={analyzeCompleted}
      onCompleted={() => router.push(`/sales?artifactId=${completedArtifactId}`)}
    />
  )

  return (
    <section
      id="upload"
      style={{
        paddingTop: '96px',
        paddingBottom: '96px',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: '640px' }}
      >
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <p className="section-label" style={{ marginBottom: '12px' }}>
            免费体验
          </p>
          <h2 className="h2-section" style={{ marginBottom: '12px' }}>
            上传你的简历
          </h2>
          <p className="body-text">
            支持 PDF 和 DOCX 格式，30秒内获得专业分析
          </p>
        </div>

        <div
          className="card-light"
          style={{ padding: '32px' }}
        >
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="relative text-center"
            style={{
              border: dragOver ? '2px dashed #2A6041' : '2px dashed #E5E7EB',
              borderRadius: '12px',
              padding: '32px',
              backgroundColor: dragOver ? 'rgba(42,96,65,0.05)' : 'transparent',
              transition: 'border-color 0.2s, background-color 0.2s',
            }}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText style={{ width: '32px', height: '32px', color: '#2A6041' }} />
                <div className="text-left">
                  <p style={{ fontWeight: 600, color: '#1A1A1A', fontSize: '15px' }}>{file.name}</p>
                  <p style={{ fontSize: '13px', color: '#6B7280' }}>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  style={{ marginLeft: '8px', color: '#6B7280', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
            ) : (
              <>
                <Upload style={{ width: '40px', height: '40px', color: '#D1D5DB', margin: '0 auto 12px' }} />
                <p style={{ color: '#1A1A1A', fontSize: '15px', marginBottom: '4px' }}>
                  拖拽简历到此处，或点击上传
                </p>
                <p style={{ fontSize: '13px', color: '#6B7280' }}>支持 PDF / DOCX 格式，最大 10MB</p>
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </>
            )}
          </div>

          {/* Target role input */}
          <div style={{ marginTop: '20px' }}>
            <input
              type="text"
              placeholder="目标岗位，例如：产品经理、前端工程师、数据分析师"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '15px',
                color: '#1A1A1A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* JD paste input (optional) */}
          <div style={{ marginTop: '16px' }}>
            <textarea
              placeholder="粘贴目标职位描述 JD（选填，推荐）——粘贴 JD 可让分析精准提升 40%"
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1A1A1A',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                minHeight: '72px',
              }}
            />
          </div>

          {error && (
            <p style={{ marginTop: '12px', fontSize: '14px', color: '#EF4444' }}>{error}</p>
          )}

          {/* Hint when file uploaded but missing target role */}
          {file && !targetRole.trim() && !error && (
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#F59E0B' }}>
              请输入目标岗位后即可开始分析
            </p>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!file || !targetRole.trim()}
            className="btn-primary"
            style={{
              width: '100%',
              marginTop: '20px',
              height: '52px',
              fontSize: '16px',
              ...( (!file || !targetRole.trim()) ? { backgroundColor: '#9CA3AF', cursor: 'not-allowed', opacity: 0.7 } : {} ),
            }}
          >
            立即获取导师建议
          </button>
        </div>
      </div>
    </section>
  )
}
