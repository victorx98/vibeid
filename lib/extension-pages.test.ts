import { describe, expect, it } from 'vitest'

import {
  appendExtensionIdToUrl,
  buildCheckoutCancelBridgeHtml,
  buildCheckoutSuccessBridgeHtml,
  buildExtensionPurchasePageUrl,
  buildExtensionPurchaseSuccessPageUrl,
  buildPasswordRecoveryBridgeHtml,
  buildPasswordRecoveryRedirectUrl,
  buildSignupConfirmBridgeHtml,
  buildSignupConfirmRedirectUrl,
  isAllowedAuthBridgeRedirect,
  isValidExtensionId,
  PASSWORD_RECOVERY_PAGE_PATH,
  resolveDefaultSignupRedirectTo,
  resolveExtensionId,
  SIGNUP_CONFIRM_PAGE_PATH,
} from './extension-pages'

const EXT_ID = 'abcdefghijklmnopabcdefghijklmnop'

describe('extension page helpers', () => {
  it('validates Chrome extension IDs', () => {
    expect(isValidExtensionId(EXT_ID)).toBe(true)
    expect(isValidExtensionId('not-an-extension-id')).toBe(false)
  })

  it('prefers the request extension id over the env fallback', () => {
    const otherId = 'bcdefghijklmnopabcdefghijklmnopa'
    expect(resolveExtensionId(otherId, EXT_ID)).toBe(otherId)
    expect(resolveExtensionId(undefined, EXT_ID)).toBe(EXT_ID)
    expect(resolveExtensionId('invalid', EXT_ID)).toBe(EXT_ID)
  })

  it('builds the plugin purchase page URL', () => {
    expect(buildExtensionPurchasePageUrl(EXT_ID)).toBe(
      `chrome-extension://${EXT_ID}/purchase/purchase.html`
    )
  })

  it('builds the plugin purchase success page URL', () => {
    expect(buildExtensionPurchaseSuccessPageUrl(EXT_ID)).toBe(
      `chrome-extension://${EXT_ID}/purchase/success.html`
    )
  })

  it('appends extensionId to Stripe cancel bridge URLs', () => {
    expect(appendExtensionIdToUrl('http://localhost:3000/checkout/cancel', EXT_ID)).toBe(
      `http://localhost:3000/checkout/cancel?extensionId=${EXT_ID}`
    )
  })

  it('appends extensionId to Stripe success bridge URLs', () => {
    expect(appendExtensionIdToUrl('http://localhost:3000/checkout/success', EXT_ID)).toBe(
      `http://localhost:3000/checkout/success?extensionId=${EXT_ID}`
    )
  })

  it('renders a cancel bridge page that redirects to purchase.html', () => {
    const html = buildCheckoutCancelBridgeHtml(EXT_ID)
    const targetUrl = `chrome-extension://${EXT_ID}/purchase/purchase.html`
    expect(html).toContain(targetUrl)
    expect(html).toContain('window.location.replace')
    expect(html).not.toContain('chrome.runtime.sendMessage')
  })

  it('renders a success bridge page that redirects to success.html', () => {
    const html = buildCheckoutSuccessBridgeHtml(EXT_ID)
    const targetUrl = `chrome-extension://${EXT_ID}/purchase/success.html`
    expect(html).toContain(targetUrl)
    expect(html).toContain('window.location.replace')
    expect(html).not.toContain('chrome.runtime.sendMessage')
  })

  it('builds password recovery redirect URLs', () => {
    expect(PASSWORD_RECOVERY_PAGE_PATH).toBe('/auth/recovery')
    expect(buildPasswordRecoveryRedirectUrl('http://localhost:3000', EXT_ID)).toBe(
      `http://localhost:3000/auth/recovery?extensionId=${EXT_ID}`
    )
  })

  it('renders a password recovery bridge page that posts to /auth/reset-password', () => {
    const html = buildPasswordRecoveryBridgeHtml(EXT_ID)
    expect(html).toContain(EXT_ID)
    expect(html).toContain('JI_PASSWORD_RECOVERY_COMPLETE')
    expect(html).toContain('/auth/reset-password')
    expect(html).toContain("recoveryTokens.type !== 'recovery'")
  })

  it('renders password recovery without extension id when extensionId is absent', () => {
    const html = buildPasswordRecoveryBridgeHtml(null)
    expect(html).toContain('var extensionId = null')
    expect(html).toContain('/auth/reset-password')
  })

  it('builds signup confirmation redirect URLs', () => {
    expect(SIGNUP_CONFIRM_PAGE_PATH).toBe('/auth/confirm')
    expect(buildSignupConfirmRedirectUrl('http://localhost:3000', EXT_ID)).toBe(
      `http://localhost:3000/auth/confirm?extensionId=${EXT_ID}`
    )
  })

  it('derives default signup redirects from AUTH_ALLOWED_REDIRECT_PREFIX', () => {
    expect(
      resolveDefaultSignupRedirectTo('https://vibeid.co/auth/recovery', EXT_ID)
    ).toBe(`https://vibeid.co/auth/confirm?extensionId=${EXT_ID}`)
    expect(resolveDefaultSignupRedirectTo('https://vibeid.co/auth/recovery', null)).toBe(
      'https://vibeid.co/auth/confirm'
    )
    expect(resolveDefaultSignupRedirectTo(null, EXT_ID)).toBeNull()
  })

  it('allows signup confirm redirects on the same origin as the recovery prefix', () => {
    const prefix = 'http://localhost:3000/auth/recovery'
    expect(
      isAllowedAuthBridgeRedirect(
        `http://localhost:3000/auth/confirm?extensionId=${EXT_ID}`,
        prefix
      )
    ).toBe(true)
    expect(isAllowedAuthBridgeRedirect('https://evil.example/auth/confirm', prefix)).toBe(false)
  })

  it('renders a signup confirmation bridge page that messages the extension', () => {
    const html = buildSignupConfirmBridgeHtml(EXT_ID)
    expect(html).toContain(EXT_ID)
    expect(html).toContain('JI_SIGNUP_COMPLETE')
    expect(html).toContain('/auth/me')
    expect(html).toContain("signupTokens.type !== 'signup'")
  })

  it('renders signup confirmation without extension id when extensionId is absent', () => {
    const html = buildSignupConfirmBridgeHtml(null)
    expect(html).toContain('var extensionId = null')
    expect(html).toContain('/auth/me')
  })
})
