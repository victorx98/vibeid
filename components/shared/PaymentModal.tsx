'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/client-api'

type ProductTier = 'basic' | 'resume'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  title: string
  price: string
  description: string
  productTier: ProductTier
  artifactId: string
}

type Stage = 'pay' | 'loading'

export default function PaymentModal({
  open,
  onClose,
  title,
  price,
  description,
  productTier,
  artifactId,
}: PaymentModalProps) {
  const [stage, setStage] = useState<Stage>('pay')
  const [error, setError] = useState<string | null>(null)
  const requestAbortRef = useRef<AbortController | null>(null)
  const requestEpochRef = useRef(0)

  const clearPendingRequest = useCallback(() => {
    if (requestAbortRef.current) {
      requestAbortRef.current.abort()
      requestAbortRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) {
      requestEpochRef.current += 1
      clearPendingRequest()
      setStage('pay')
      setError(null)
    }
  }, [clearPendingRequest, open])

  useEffect(() => {
    return () => {
      requestEpochRef.current += 1
      clearPendingRequest()
    }
  }, [clearPendingRequest])

  async function handlePay() {
    requestEpochRef.current += 1
    const requestEpoch = requestEpochRef.current
    clearPendingRequest()
    setError(null)
    setStage('loading')

    const controller = new AbortController()
    requestAbortRef.current = controller

    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productTier, artifactId }),
        signal: controller.signal,
      })
      if (requestEpochRef.current !== requestEpoch) return
      requestAbortRef.current = null
      if (!res.ok) {
        const message = await getApiErrorMessage(res, '支付确认失败，请稍后重试')
        if (requestEpochRef.current !== requestEpoch) return
        throw new Error(message)
      }
      const { url } = await res.json()
      if (typeof url !== 'string' || !url) {
        throw new Error('支付订单创建失败，请稍后重试')
      }
      window.location.assign(url)
    } catch (err) {
      if (requestEpochRef.current !== requestEpoch) return
      requestAbortRef.current = null
      if (err instanceof Error && err.name === 'AbortError') return
      setStage('pay')
      setError(err instanceof Error ? err.message : '支付确认失败，请稍后重试')
    }
  }

  function handleClose() {
    requestEpochRef.current += 1
    clearPendingRequest()
    setStage('pay')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) handleClose()
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {stage === 'pay' && (
          <div className="space-y-4">
            <p className="text-gray-600">{description}</p>
            <div className="text-3xl font-bold text-center" style={{ color: '#2A6041' }}>{price}</div>

            {error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  无法完成支付
                </div>
                <p>{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handlePay} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                前往安全支付
              </Button>
            </div>
          </div>
        )}

        {stage === 'loading' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#d1e7d9', borderTopColor: '#2A6041' }} />
            <p className="text-gray-500">支付处理中...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
