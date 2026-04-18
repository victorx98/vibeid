'use client'

import { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  title: string
  price: string
  description: string
}

export default function PaymentModal({ open, onClose, onSuccess, title, price, description }: PaymentModalProps) {
  const [stage, setStage] = useState<'pay' | 'loading' | 'success'>('pay')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t))
    timersRef.current = []
  }, [])

  function handlePay() {
    clearTimers()
    setStage('loading')
    const t1 = setTimeout(() => {
      setStage('success')
      const t2 = setTimeout(() => {
        setStage('pay')
        onSuccess()
      }, 1000)
      timersRef.current.push(t2)
    }, 1500)
    timersRef.current.push(t1)
  }

  function handleClose() {
    clearTimers()
    setStage('pay')
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
