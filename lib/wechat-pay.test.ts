import { createSign, generateKeyPairSync } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'

import {
  buildJsapiPayParams,
  buildWechatPayAuthorization,
  decryptWechatResource,
  detectWechatPayChannel,
  encryptWechatResourceForTest,
  signWechatOAuthState,
  verifyWechatOAuthState,
  verifyWechatPaySignature,
  type WechatPayConfig,
} from './wechat-pay'

const ORIGINAL_SECRET = process.env.ENTITLEMENTS_SECRET

function testConfig(): WechatPayConfig {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  })
  return {
    mchId: '1900000001',
    appId: 'wx1234567890abcdef',
    appSecret: 'test-secret',
    apiV3Key: '12345678901234567890123456789012',
    merchantSerialNo: 'SERIALNO',
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  }
}

describe('wechat pay channel detection', () => {
  it('detects WeChat WebView, mobile browser, and desktop browser', () => {
    expect(detectWechatPayChannel('Mozilla/5.0 MicroMessenger/8.0 iPhone')).toBe('jsapi')
    expect(detectWechatPayChannel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('h5')
    expect(detectWechatPayChannel('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('native')
  })
})

describe('wechat pay crypto helpers', () => {
  it('builds request authorization and verifies webhook signatures', () => {
    const config = testConfig()
    const url = new URL('https://api.mch.weixin.qq.com/v3/pay/transactions/native')
    const authorization = buildWechatPayAuthorization({
      method: 'POST',
      url,
      body: '{"hello":"world"}',
      config,
      timestamp: '1710000000',
      nonce: 'nonce-value',
    })
    const sign = createSign('RSA-SHA256')
    sign.update('1710000000\nnonce-value\n{"hello":"world"}\n')
    sign.end()
    const webhookSignature = sign.sign(config.privateKey, 'base64')

    expect(authorization).toContain('WECHATPAY2-SHA256-RSA2048')
    expect(authorization).toContain('mchid="1900000001"')
    expect(
      verifyWechatPaySignature({
        body: '{"hello":"world"}',
        timestamp: '1710000000',
        nonce: 'nonce-value',
        signature: webhookSignature,
        config,
      })
    ).toBe(true)
  })

  it('decrypts API v3 webhook resources', () => {
    const config = testConfig()
    const transaction = {
      out_trade_no: 'wx123',
      transaction_id: '4200000000',
      trade_state: 'SUCCESS',
      amount: { total: 3900, currency: 'CNY' },
    }
    const ciphertext = encryptWechatResourceForTest(
      transaction,
      'nonce12345678',
      'transaction',
      config.apiV3Key
    )

    expect(
      decryptWechatResource(
        {
          algorithm: 'AEAD_AES_256_GCM',
          ciphertext,
          nonce: 'nonce12345678',
          associated_data: 'transaction',
        },
        config
      )
    ).toEqual(transaction)
  })

  it('builds JSAPI pay params with an RSA signature', () => {
    const config = testConfig()
    const params = buildJsapiPayParams('prepay-id', config, '1710000000', 'nonce-value')

    expect(params).toMatchObject({
      appId: config.appId,
      timeStamp: '1710000000',
      nonceStr: 'nonce-value',
      package: 'prepay_id=prepay-id',
      signType: 'RSA',
    })
    expect(params.paySign.length).toBeGreaterThan(100)
  })
})

describe('wechat oauth state', () => {
  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.ENTITLEMENTS_SECRET
    else process.env.ENTITLEMENTS_SECRET = ORIGINAL_SECRET
  })

  it('rejects tampered signed state', () => {
    process.env.ENTITLEMENTS_SECRET = 'test-secret-' + 'x'.repeat(40)
    const state = signWechatOAuthState({
      userId: 'user-id',
      artifactId: 'artifact-id',
      productTier: 'basic',
      returnPath: '/sales?artifactId=artifact-id',
    })

    expect(verifyWechatOAuthState(state)?.userId).toBe('user-id')
    expect(verifyWechatOAuthState(state.replace(/.$/, 'x'))).toBeNull()
  })
})
