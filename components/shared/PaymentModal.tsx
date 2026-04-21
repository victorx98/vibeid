'use client'

import { useState, useRef, useCallback } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/client-api'

type ProductTier = 'basic' | 'resume'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  title: string
  price: string
  description: string
  productTier: ProductTier
}

type Stage = 'pay' | 'loading' | 'success'

export default function PaymentModal({
  open,
  onClose,
  onSuccess,
  title,
  price,
  description,
  productTier,
}: PaymentModalProps) {
  const [stage, setStage] = useState<Stage>('pay')
  const [error, setError] = useState<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
  }, [])

  async function handlePay() {
    setError(null)
    setStage('loading')
    try {
      const res = await fetch('/api/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productTier }),
      })
      if (!res.ok) {
        const message = await getApiErrorMessage(res, '支付确认失败，请稍后重试')
        throw new Error(message)
      }
      setStage('success')
      clearSuccessTimer()
      successTimerRef.current = setTimeout(() => {
        setStage('pay')
        onSuccess()
      }, 1000)
    } catch (err) {
      setStage('pay')
      setError(err instanceof Error ? err.message : '支付确认失败，请稍后重试')
    }
  }

  function handleClose() {
    clearSuccessTimer()
    setStage('pay')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
              <Button onClick={handlePay} className="flex-1 bg-green-500 hover:bg-green-600 text-white">
                <span className="mr-2">💬</span>微信支付
              </Button>
              <Button onClick={handlePay} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                <span className="mr-2">🔷</span>支付宝
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

        {stage === 'success' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <p className="text-lg font-semibold text-green-600">支付成功!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
