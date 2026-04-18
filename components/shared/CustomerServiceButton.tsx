'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'

export default function CustomerServiceButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed z-40 flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
        style={{
          bottom: '28px',
          right: '28px',
          backgroundColor: '#2A6041',
          color: '#ffffff',
          borderRadius: '50px',
          padding: '14px 20px',
          border: 'none',
          cursor: 'pointer',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-semibold">在线咨询</span>
      </motion.button>

      {/* Modal overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed z-50 bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{
                bottom: '90px',
                right: '28px',
                width: '320px',
              }}
            >
              {/* Header */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ backgroundColor: '#0E2620' }}
              >
                <div>
                  <h3 className="font-bold text-white text-base">联系我们</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    扫码添加专属顾问
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 text-center">
                {/* QR Code placeholder — replace src with real QR image */}
                <div
                  className="mx-auto flex items-center justify-center rounded-xl mb-4"
                  style={{
                    width: '180px',
                    height: '180px',
                    backgroundColor: '#F9FAFB',
                    border: '2px solid #E5E7EB',
                  }}
                >
                  {/* Replace this div with <img src="/qr-code.png" /> when you have the real QR */}
                  <div className="text-center">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2" style={{ color: '#2A6041' }} />
                    <span className="text-xs" style={{ color: '#6B7280' }}>
                      微信二维码
                    </span>
                  </div>
                </div>

                <p className="font-semibold text-sm mb-1" style={{ color: '#1A1A1A' }}>
                  微信扫码 · 添加专属顾问
                </p>
                <p className="text-xs" style={{ color: '#6B7280', lineHeight: 1.6 }}>
                  工作日 9:00-21:00 在线
                  <br />
                  一对一解答求职疑问
                </p>

                {/* Quick contact options */}
                <div
                  className="mt-4 pt-4 flex items-center justify-center gap-6"
                  style={{ borderTop: '1px solid #F3F4F6' }}
                >
                  <div className="text-center">
                    <div className="text-xs font-medium" style={{ color: '#2A6041' }}>
                      即时响应
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      平均3分钟
                    </div>
                  </div>
                  <div
                    style={{ width: '1px', height: '24px', backgroundColor: '#E5E7EB' }}
                  />
                  <div className="text-center">
                    <div className="text-xs font-medium" style={{ color: '#2A6041' }}>
                      专属顾问
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      一对一服务
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
