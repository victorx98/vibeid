'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CreditCard, QrCode, Smartphone } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/client-api'

type ProductTier = 'basic' | 'resume'
type Stage = 'pay' | 'loading' | 'wechat-qr' | 'wechat-waiting'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  title: string
  price: string
  description: string
  productTier: ProductTier
  artifactId: string
}

interface WechatJsapiParams {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'RSA'
  paySign: string
}

interface WechatBridge {
  invoke(
    name: 'getBrandWCPayRequest',
    params: WechatJsapiParams,
    callback: (res: { err_msg?: string }) => void
  ): void
}

declare global {
  interface Window {
    WeixinJSBridge?: WechatBridge
  }
}

function paidRedirectUrl(artifactId: string, orderId?: string): string {
  const url = new URL('/result', window.location.origin)
  url.searchParams.set('artifactId', artifactId)
  url.searchParams.set('checkout', 'success')
  if (orderId) url.searchParams.set('checkoutOrderId', orderId)
  return url.toString()
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function getCurrentWechatAutoStart(productTier: ProductTier): boolean {
  const params = new URLSearchParams(window.location.search)
  return (
    params.get('wechat_pay') === '1' &&
    params.get('wechat_oauth') === 'success' &&
    params.get('wechat_product') === productTier
  )
}

async function invokeWechatJsapiPay(params: WechatJsapiParams): Promise<void> {
  const bridge = window.WeixinJSBridge
  if (!bridge) {
    await new Promise<void>((resolve) => {
      document.addEventListener('WeixinJSBridgeReady', () => resolve(), { once: true })
    })
  }

  await new Promise<void>((resolve, reject) => {
    window.WeixinJSBridge?.invoke('getBrandWCPayRequest', params, (res) => {
      if (res.err_msg === 'get_brand_wcpay_request:ok') {
        resolve()
        return
      }
      if (res.err_msg === 'get_brand_wcpay_request:cancel') {
        reject(new Error('你已取消微信支付'))
        return
      }
      reject(new Error('微信支付未完成，请稍后重试'))
    })
  })
}

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
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [wechatOrderId, setWechatOrderId] = useState<string | null>(null)
  const requestAbortRef = useRef<AbortController | null>(null)
  const requestEpochRef = useRef(0)
  const autoStartedRef = useRef(false)

  const clearPendingRequest = useCallback(() => {
    if (requestAbortRef.current) {
      requestAbortRef.current.abort()
      requestAbortRef.current = null
    }
  }, [])

  const pollOrderUntilPaid = useCallback(async (orderId: string, requestEpoch: number) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await wait(attempt === 0 ? 800 : 2_000)
      if (requestEpochRef.current !== requestEpoch) return

      const res = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(orderId)}`, {
        credentials: 'include',
      })
      if (requestEpochRef.current !== requestEpoch) return
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, '支付状态查询失败，请稍后重试'))
      }

      const data = await res.json()
      const status = data?.order?.status
      const entitlements = Array.isArray(data?.entitlements) ? data.entitlements : []
      if (status === 'paid' || entitlements.includes(productTier)) {
        window.location.assign(paidRedirectUrl(artifactId, orderId))
        return
      }
      if (status === 'canceled') {
        throw new Error('订单已取消，请重新发起支付')
      }
    }

    throw new Error('暂未确认支付结果，请稍后刷新页面或联系客服')
  }, [artifactId, productTier])

  const handleStripePay = useCallback(async () => {
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
  }, [artifactId, clearPendingRequest, productTier])

  const handleWechatPay = useCallback(async () => {
    requestEpochRef.current += 1
    const requestEpoch = requestEpochRef.current
    clearPendingRequest()
    setError(null)
    setQrSvg(null)
    setWechatOrderId(null)
    setStage('loading')

    const controller = new AbortController()
    requestAbortRef.current = controller

    try {
      const res = await fetch('/api/checkout/wechat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productTier, artifactId }),
        signal: controller.signal,
      })
      if (requestEpochRef.current !== requestEpoch) return
      requestAbortRef.current = null
      if (!res.ok) {
        const message = await getApiErrorMessage(res, '微信支付创建失败，请稍后重试')
        if (requestEpochRef.current !== requestEpoch) return
        throw new Error(message)
      }

      const data = await res.json()
      if (data.type === 'authorize' && typeof data.authorizeUrl === 'string') {
        window.location.assign(data.authorizeUrl)
        return
      }
      if (data.type === 'h5' && typeof data.h5Url === 'string') {
        window.location.assign(data.h5Url)
        return
      }
      if (data.type === 'native' && typeof data.qrSvg === 'string' && typeof data.orderId === 'string') {
        setQrSvg(data.qrSvg)
        setWechatOrderId(data.orderId)
        setStage('wechat-qr')
        await pollOrderUntilPaid(data.orderId, requestEpoch)
        return
      }
      if (data.type === 'jsapi' && data.payParams && typeof data.orderId === 'string') {
        setWechatOrderId(data.orderId)
        setStage('wechat-waiting')
        await invokeWechatJsapiPay(data.payParams)
        await pollOrderUntilPaid(data.orderId, requestEpoch)
        return
      }

      throw new Error('微信支付返回异常，请稍后重试')
    } catch (err) {
      if (requestEpochRef.current !== requestEpoch) return
      requestAbortRef.current = null
      if (err instanceof Error && err.name === 'AbortError') return
      setStage('pay')
      setError(err instanceof Error ? err.message : '微信支付失败，请稍后重试')
    }
  }, [artifactId, clearPendingRequest, pollOrderUntilPaid, productTier])

  useEffect(() => {
    if (!open) {
      requestEpochRef.current += 1
      clearPendingRequest()
      setStage('pay')
      setError(null)
      setQrSvg(null)
      setWechatOrderId(null)
      autoStartedRef.current = false
    }
  }, [clearPendingRequest, open])

  useEffect(() => {
    return () => {
      requestEpochRef.current += 1
      clearPendingRequest()
    }
  }, [clearPendingRequest])

  useEffect(() => {
    if (!open || autoStartedRef.current || stage !== 'pay') return
    if (!getCurrentWechatAutoStart(productTier)) return
    autoStartedRef.current = true
    void handleWechatPay()
  }, [handleWechatPay, open, productTier, stage])

  function handleClose() {
    requestEpochRef.current += 1
    clearPendingRequest()
    setStage('pay')
    setError(null)
    setQrSvg(null)
    setWechatOrderId(null)
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

            <div className="grid gap-3">
              <Button onClick={handleWechatPay} className="h-12 w-full bg-green-600 hover:bg-green-700 text-white">
                <Smartphone className="h-4 w-4" />
                微信支付
              </Button>
              <Button onClick={handleStripePay} variant="outline" className="h-12 w-full">
                <CreditCard className="h-4 w-4" />
                银行卡 / 国际支付
              </Button>
            </div>
          </div>
        )}

        {stage === 'loading' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#d1e7d9', borderTopColor: '#2A6041' }} />
            <p className="text-gray-500">正在创建支付订单...</p>
          </div>
        )}

        {stage === 'wechat-qr' && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-3" aria-label="微信支付二维码">
              {qrSvg ? (
                <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
              ) : (
                <QrCode className="h-32 w-32 text-gray-300" />
              )}
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">使用微信扫码支付</p>
              <p className="mt-1 text-sm text-gray-500">支付成功后将自动解锁服务</p>
              {wechatOrderId && <p className="mt-2 text-xs text-gray-400">订单尾号 {wechatOrderId.slice(-8)}</p>}
            </div>
            <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#d1e7d9', borderTopColor: '#2A6041' }} />
          </div>
        )}

        {stage === 'wechat-waiting' && (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#d1e7d9', borderTopColor: '#2A6041' }} />
            <div>
              <p className="font-medium text-gray-900">等待微信支付确认</p>
              <p className="mt-1 text-sm text-gray-500">请在微信支付弹窗中完成付款</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
