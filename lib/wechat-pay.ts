import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createSign,
  createVerify,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { readFileSync } from 'node:fs'

import { getEnv, requireEnv } from './backend-config'

export type WechatPayChannel = 'native' | 'h5' | 'jsapi'

export interface WechatPayConfig {
  mchId: string
  appId: string
  appSecret: string
  apiV3Key: string
  merchantSerialNo: string
  privateKey: string
  publicKey: string
}

export interface WechatOrderInput {
  outTradeNo: string
  description: string
  amountCents: number
  clientIp: string
  notifyUrl: string
  timeExpire?: string
  attach?: string
}

export interface WechatJsapiOrderInput extends WechatOrderInput {
  openId: string
}

export interface WechatTransaction {
  appid?: string
  mchid?: string
  out_trade_no: string
  transaction_id?: string
  trade_state: string
  trade_state_desc?: string
  attach?: string
  amount?: {
    total?: number
    payer_total?: number
    currency?: string
    payer_currency?: string
  }
  payer?: {
    openid?: string
  }
}

export interface WechatPayNotification {
  id: string
  create_time: string
  event_type: string
  resource_type: string
  summary?: string
  resource: {
    algorithm: string
    ciphertext: string
    nonce: string
    associated_data?: string
  }
}

export interface WechatPayJsapiParams {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'RSA'
  paySign: string
}

export interface WechatOAuthStatePayload {
  userId: string
  artifactId: string
  productTier: 'basic' | 'resume'
  returnPath: string
  exp: number
  nonce: string
}

const WECHAT_API_BASE = 'https://api.mch.weixin.qq.com'
const WECHAT_OAUTH_BASE = 'https://api.weixin.qq.com'

function normalizePem(value: string): string {
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value
}

function readSecretValue(valueName: string, pathName: string): string {
  const inlineValue = getEnv(valueName)
  if (inlineValue) return normalizePem(inlineValue)

  const filePath = getEnv(pathName)
  if (filePath) return readFileSync(filePath, 'utf8')

  throw new Error(`${valueName} or ${pathName} is not configured`)
}

export function getWechatPayConfig(): WechatPayConfig {
  return {
    mchId: requireEnv('WECHAT_PAY_MCH_ID'),
    appId: requireEnv('WECHAT_PAY_APP_ID'),
    appSecret: requireEnv('WECHAT_PAY_APP_SECRET'),
    apiV3Key: requireEnv('WECHAT_PAY_API_V3_KEY'),
    merchantSerialNo: requireEnv('WECHAT_PAY_MERCHANT_SERIAL_NO'),
    privateKey: readSecretValue('WECHAT_PAY_PRIVATE_KEY', 'WECHAT_PAY_PRIVATE_KEY_PATH'),
    publicKey: readSecretValue('WECHAT_PAY_PUBLIC_KEY', 'WECHAT_PAY_PUBLIC_KEY_PATH'),
  }
}

export function isWeChatBrowser(userAgent: string | null): boolean {
  return /micromessenger/i.test(userAgent ?? '')
}

export function isMobileBrowser(userAgent: string | null): boolean {
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent ?? '')
}

export function detectWechatPayChannel(userAgent: string | null): WechatPayChannel {
  if (isWeChatBrowser(userAgent)) return 'jsapi'
  if (isMobileBrowser(userAgent)) return 'h5'
  return 'native'
}

function createNonce(): string {
  return randomBytes(16).toString('hex')
}

function signWithPrivateKey(message: string, privateKey: string): string {
  const sign = createSign('RSA-SHA256')
  sign.update(message)
  sign.end()
  return sign.sign(privateKey, 'base64')
}

function verifyWithPublicKey(message: string, signature: string, publicKey: string): boolean {
  const verify = createVerify('RSA-SHA256')
  verify.update(message)
  verify.end()
  return verify.verify(publicKey, signature, 'base64')
}

export function buildWechatPayAuthorization(input: {
  method: string
  url: URL
  body: string
  config?: WechatPayConfig
  timestamp?: string
  nonce?: string
}): string {
  const config = input.config ?? getWechatPayConfig()
  const timestamp = input.timestamp ?? String(Math.floor(Date.now() / 1000))
  const nonce = input.nonce ?? createNonce()
  const pathWithQuery = `${input.url.pathname}${input.url.search}`
  const message = `${input.method.toUpperCase()}\n${pathWithQuery}\n${timestamp}\n${nonce}\n${input.body}\n`
  const signature = signWithPrivateKey(message, config.privateKey)

  return `WECHATPAY2-SHA256-RSA2048 ${[
    `mchid="${config.mchId}"`,
    `nonce_str="${nonce}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${config.merchantSerialNo}"`,
    `signature="${signature}"`,
  ].join(',')}`
}

export function verifyWechatPaySignature(input: {
  body: string
  timestamp: string | null
  nonce: string | null
  signature: string | null
  config?: WechatPayConfig
}): boolean {
  if (!input.timestamp || !input.nonce || !input.signature) return false
  const config = input.config ?? getWechatPayConfig()
  const message = `${input.timestamp}\n${input.nonce}\n${input.body}\n`
  return verifyWithPublicKey(message, input.signature, config.publicKey)
}

export function decryptWechatResource<T = unknown>(
  resource: WechatPayNotification['resource'],
  config: WechatPayConfig = getWechatPayConfig()
): T {
  if (resource.algorithm !== 'AEAD_AES_256_GCM') {
    throw new Error(`Unsupported WeChat resource algorithm: ${resource.algorithm}`)
  }

  const encrypted = Buffer.from(resource.ciphertext, 'base64')
  const authTag = encrypted.subarray(encrypted.length - 16)
  const ciphertext = encrypted.subarray(0, encrypted.length - 16)
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(config.apiV3Key, 'utf8'),
    Buffer.from(resource.nonce, 'utf8')
  )

  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'))
  }
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(decrypted.toString('utf8')) as T
}

export function encryptWechatResourceForTest(
  value: unknown,
  resourceNonce: string,
  associatedData: string,
  apiV3Key: string
): string {
  const cipher = createCipheriv(
    'aes-256-gcm',
    Buffer.from(apiV3Key, 'utf8'),
    Buffer.from(resourceNonce, 'utf8')
  )
  cipher.setAAD(Buffer.from(associatedData, 'utf8'))
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ])
  return Buffer.concat([encrypted, cipher.getAuthTag()]).toString('base64')
}

async function requestWechat<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<T> {
  const config = getWechatPayConfig()
  const url = new URL(path, WECHAT_API_BASE)
  const bodyText = body == null ? '' : JSON.stringify(body)
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: buildWechatPayAuthorization({
        method,
        url,
        body: bodyText,
        config,
      }),
    },
    body: bodyText || undefined,
  })

  const text = await res.text()
  const signature = res.headers.get('wechatpay-signature')
  if (signature) {
    const valid = verifyWechatPaySignature({
      body: text,
      timestamp: res.headers.get('wechatpay-timestamp'),
      nonce: res.headers.get('wechatpay-nonce'),
      signature,
      config,
    })
    if (!valid) throw new Error('Invalid WeChat Pay response signature')
  }

  if (!res.ok) {
    throw new Error(`WeChat Pay request failed: ${res.status} ${text}`)
  }

  return (text ? JSON.parse(text) : {}) as T
}

function baseOrderPayload(input: WechatOrderInput, config: WechatPayConfig) {
  return {
    appid: config.appId,
    mchid: config.mchId,
    description: input.description,
    out_trade_no: input.outTradeNo,
    time_expire: input.timeExpire,
    attach: input.attach,
    notify_url: input.notifyUrl,
    amount: {
      total: input.amountCents,
      currency: 'CNY',
    },
    scene_info: {
      payer_client_ip: input.clientIp,
    },
  }
}

export async function createWechatNativeOrder(
  input: WechatOrderInput
): Promise<{ codeUrl: string }> {
  const config = getWechatPayConfig()
  const data = await requestWechat<{ code_url: string }>(
    'POST',
    '/v3/pay/transactions/native',
    baseOrderPayload(input, config)
  )
  return { codeUrl: data.code_url }
}

export async function createWechatH5Order(input: WechatOrderInput): Promise<{ h5Url: string }> {
  const config = getWechatPayConfig()
  const data = await requestWechat<{ h5_url: string }>(
    'POST',
    '/v3/pay/transactions/h5',
    {
      ...baseOrderPayload(input, config),
      scene_info: {
        payer_client_ip: input.clientIp,
        h5_info: {
          type: 'Wap',
          app_name: 'Vibe ID',
          app_url: getEnv('NEXT_PUBLIC_APP_URL') ?? undefined,
        },
      },
    }
  )
  return { h5Url: data.h5_url }
}

export async function createWechatJsapiOrder(
  input: WechatJsapiOrderInput
): Promise<WechatPayJsapiParams> {
  const config = getWechatPayConfig()
  const data = await requestWechat<{ prepay_id: string }>(
    'POST',
    '/v3/pay/transactions/jsapi',
    {
      ...baseOrderPayload(input, config),
      payer: {
        openid: input.openId,
      },
    }
  )
  return buildJsapiPayParams(data.prepay_id, config)
}

export function buildJsapiPayParams(
  prepayId: string,
  config: WechatPayConfig = getWechatPayConfig(),
  timestamp = String(Math.floor(Date.now() / 1000)),
  nonceStr = createNonce()
): WechatPayJsapiParams {
  const packageValue = `prepay_id=${prepayId}`
  const message = `${config.appId}\n${timestamp}\n${nonceStr}\n${packageValue}\n`
  return {
    appId: config.appId,
    timeStamp: timestamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign: signWithPrivateKey(message, config.privateKey),
  }
}

export async function queryWechatOrderByOutTradeNo(
  outTradeNo: string
): Promise<WechatTransaction> {
  const config = getWechatPayConfig()
  return requestWechat<WechatTransaction>(
    'GET',
    `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(config.mchId)}`
  )
}

export function buildWechatOAuthAuthorizeUrl(input: {
  redirectUri: string
  state: string
  scope?: 'snsapi_base' | 'snsapi_userinfo'
}): string {
  const config = getWechatPayConfig()
  const url = new URL('https://open.weixin.qq.com/connect/oauth2/authorize')
  url.searchParams.set('appid', config.appId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', input.scope ?? 'snsapi_base')
  url.searchParams.set('state', input.state)
  return `${url.toString()}#wechat_redirect`
}

export async function exchangeWechatOAuthCodeForOpenId(code: string): Promise<string> {
  const config = getWechatPayConfig()
  const url = new URL('/sns/oauth2/access_token', WECHAT_OAUTH_BASE)
  url.searchParams.set('appid', config.appId)
  url.searchParams.set('secret', config.appSecret)
  url.searchParams.set('code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || typeof data.openid !== 'string') {
    throw new Error(`WeChat OAuth failed: ${JSON.stringify(data)}`)
  }
  return data.openid
}

export function appendWechatRedirectUrl(h5Url: string, redirectUrl: string): string {
  const separator = h5Url.includes('?') ? '&' : '?'
  return `${h5Url}${separator}redirect_url=${encodeURIComponent(redirectUrl)}`
}

export function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
}

export function signWechatOAuthState(
  payload: Omit<WechatOAuthStatePayload, 'exp' | 'nonce'>,
  ttlSeconds = 10 * 60
): string {
  const fullPayload: WechatOAuthStatePayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    nonce: createNonce(),
  }
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url')
  const signature = createHmac('sha256', requireEnv('ENTITLEMENTS_SECRET'))
    .update(encodedPayload)
    .digest('base64url')
  return `${encodedPayload}.${signature}`
}

export function verifyWechatOAuthState(state: string): WechatOAuthStatePayload | null {
  const [encodedPayload, signature] = state.split('.')
  if (!encodedPayload || !signature) return null

  const expected = createHmac('sha256', requireEnv('ENTITLEMENTS_SECRET'))
    .update(encodedPayload)
    .digest('base64url')
  if (!secureCompare(signature, expected)) return null

  const payload = JSON.parse(
    Buffer.from(encodedPayload, 'base64url').toString('utf8')
  ) as WechatOAuthStatePayload
  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  if (!['basic', 'resume'].includes(payload.productTier)) return null
  if (!payload.returnPath.startsWith('/')) return null
  return payload
}
