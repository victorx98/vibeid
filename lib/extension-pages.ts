import { isAllowedOAuthRedirect } from './google-oauth'

/** Chrome extension IDs use 32 lowercase a–p characters. */
const EXTENSION_ID_RE = /^[a-p]{32}$/

export function isValidExtensionId(id: string): boolean {
  return EXTENSION_ID_RE.test(id)
}

export function resolveExtensionId(
  fromRequest: string | null | undefined,
  fallbackEnv: string | null | undefined
): string | null {
  if (fromRequest && isValidExtensionId(fromRequest)) return fromRequest
  if (fallbackEnv && isValidExtensionId(fallbackEnv)) return fallbackEnv
  return null
}

export function buildExtensionPurchasePageUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/purchase/purchase.html`
}

export function buildExtensionPurchaseSuccessPageUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/purchase/success.html`
}

export function appendExtensionIdToUrl(baseUrl: string, extensionId: string): string {
  const url = new URL(baseUrl)
  url.searchParams.set('extensionId', extensionId)
  return url.toString()
}

/** Path for the password-recovery bridge page (also used in redirect allow-lists). */
export const PASSWORD_RECOVERY_PAGE_PATH = '/auth/recovery'

/** Path for the signup email-confirmation bridge page (also used in redirect allow-lists). */
export const SIGNUP_CONFIRM_PAGE_PATH = '/auth/confirm'

export function buildPasswordRecoveryRedirectUrl(apiBase: string, extensionId: string): string {
  const base = apiBase.replace(/\/+$/, '')
  return appendExtensionIdToUrl(`${base}${PASSWORD_RECOVERY_PAGE_PATH}`, extensionId)
}

export function buildSignupConfirmRedirectUrl(apiBase: string, extensionId: string): string {
  const base = apiBase.replace(/\/+$/, '')
  return appendExtensionIdToUrl(`${base}${SIGNUP_CONFIRM_PAGE_PATH}`, extensionId)
}

/** Default signup confirmation redirect when the client omits redirectTo. */
export function resolveDefaultSignupRedirectTo(
  allowedPrefix: string | null | undefined,
  extensionId: string | null | undefined
): string | null {
  if (!allowedPrefix) return null

  try {
    const origin = new URL(allowedPrefix).origin
    if (extensionId && isValidExtensionId(extensionId)) {
      return buildSignupConfirmRedirectUrl(origin, extensionId)
    }
    return `${origin.replace(/\/+$/, '')}${SIGNUP_CONFIRM_PAGE_PATH}`
  } catch {
    return null
  }
}

export function resolveSignupEmailRedirectTo(
  redirectTo: string | undefined,
  allowedPrefix: string | null | undefined,
  extensionId: string | null | undefined
): string | null {
  if (redirectTo) return redirectTo
  return resolveDefaultSignupRedirectTo(allowedPrefix, extensionId)
}

/** Allow chromiumapp.org, prefix matches, or sibling auth bridge pages on the same origin. */
export function isAllowedAuthBridgeRedirect(
  redirectTo: string,
  allowedPrefix: string | null | undefined
): boolean {
  if (isAllowedOAuthRedirect(redirectTo, allowedPrefix)) return true
  if (!allowedPrefix) return false

  try {
    const redirectUrl = new URL(redirectTo)
    const prefixUrl = new URL(allowedPrefix)
    if (redirectUrl.origin !== prefixUrl.origin) return false
    return (
      redirectUrl.pathname === SIGNUP_CONFIRM_PAGE_PATH ||
      redirectUrl.pathname === PASSWORD_RECOVERY_PAGE_PATH
    )
  } catch {
    return false
  }
}

/**
 * Stripe cancel bridge page. Redirects to the extension purchase page using a
 * server-built chrome-extension:// URL (Stripe lands here via CHECKOUT_CANCEL_URL).
 */
export function buildCheckoutCancelBridgeHtml(extensionId: string): string {
  const targetUrl = buildExtensionPurchasePageUrl(extensionId)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>EdAIX</title>
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; text-align: center; color: #111; }
    a { color: #1a73e8; }
  </style>
</head>
<body>
  <p>Payment was cancelled. Returning to EdAIX…</p>
  <p>If you are not redirected, <a id="continue" href="${targetUrl}">continue in EdAIX</a>.</p>
  <script>
  (function () {
    var targetUrl = ${JSON.stringify(targetUrl)};
    window.location.replace(targetUrl);
  })();
  </script>
</body>
</html>`
}

/**
 * Stripe success bridge page. Redirects to the extension purchase-success page
 * using a server-built chrome-extension:// URL (Stripe lands here via CHECKOUT_SUCCESS_URL).
 */
export function buildCheckoutSuccessBridgeHtml(extensionId: string): string {
  const targetUrl = buildExtensionPurchaseSuccessPageUrl(extensionId)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>EdAIX</title>
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; text-align: center; color: #111; }
    a { color: #1a73e8; }
  </style>
</head>
<body>
  <p>Payment successful. Returning to EdAIX…</p>
  <p>If you are not redirected, <a id="continue" href="${targetUrl}">continue in EdAIX</a>.</p>
  <script>
  (function () {
    var targetUrl = ${JSON.stringify(targetUrl)};
    window.location.replace(targetUrl);
  })();
  </script>
</body>
</html>`
}

/**
 * Password-recovery bridge page. Supabase redirects here with recovery tokens in the
 * URL hash; the page collects a new password, calls POST /auth/reset-password,
 * then optionally messages the extension (externally_connectable).
 */
export function buildPasswordRecoveryBridgeHtml(extensionId: string | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Reset password — EdAIX</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.25rem; margin: 0 0 1rem; text-align: center; }
    p { margin: 0 0 1rem; line-height: 1.5; }
    .hidden { display: none; }
    .error { color: #b00020; }
    .success { text-align: center; color: #0d652d; }
    label { display: block; font-size: 0.875rem; margin-bottom: 0.25rem; }
    input { box-sizing: border-box; width: 100%; font: inherit; padding: 0.5rem 0.625rem; margin-bottom: 0.75rem; }
    button { font: inherit; font-size: 1rem; width: 100%; padding: 0.75rem 1.25rem; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
  </style>
</head>
<body>
  <div id="error-panel" class="hidden">
    <h1>Reset link invalid</h1>
    <p id="error-message" class="error"></p>
    <p>Request a new password reset email from the EdAIX extension and try again.</p>
  </div>
  <form id="reset-form" class="hidden">
    <h1>Set a new password</h1>
    <p>Choose a new password for your EdAIX account.</p>
    <label for="password">New password</label>
    <input id="password" name="password" type="password" autocomplete="new-password" minlength="6" required>
    <label for="confirm">Confirm password</label>
    <input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="6" required>
    <p id="form-error" class="error hidden"></p>
    <button id="submit" type="submit">Update password</button>
  </form>
  <div id="success-panel" class="hidden success">
    <h1>Password updated</h1>
    <p id="success-message">You can close this tab and return to EdAIX.</p>
  </div>
  <script>
  (function () {
    var extensionId = ${JSON.stringify(extensionId)};
    var errorPanel = document.getElementById('error-panel');
    var errorMessage = document.getElementById('error-message');
    var resetForm = document.getElementById('reset-form');
    var formError = document.getElementById('form-error');
    var successPanel = document.getElementById('success-panel');
    var successMessage = document.getElementById('success-message');
    var submitButton = document.getElementById('submit');
    var recoveryTokens = null;

    function showError(message) {
      errorMessage.textContent = message;
      errorPanel.classList.remove('hidden');
      resetForm.classList.add('hidden');
      successPanel.classList.add('hidden');
    }

    function showFormError(message) {
      formError.textContent = message;
      formError.classList.remove('hidden');
    }

    function clearFormError() {
      formError.textContent = '';
      formError.classList.add('hidden');
    }

    function parseHash() {
      var hash = window.location.hash.replace(/^#/, '');
      if (!hash) return null;
      var params = new URLSearchParams(hash);
      return {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token'),
        type: params.get('type'),
      };
    }

    function notifyExtension(payload) {
      if (!extensionId) return Promise.resolve(false);
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        return Promise.resolve(false);
      }
      return new Promise(function (resolve) {
        chrome.runtime.sendMessage(
          extensionId,
          { type: 'JI_PASSWORD_RECOVERY_COMPLETE', user: payload.user, session: payload.session },
          function (response) {
            if (chrome.runtime.lastError || !response || !response.ok) {
              resolve(false);
              return;
            }
            resolve(true);
          }
        );
      });
    }

    recoveryTokens = parseHash();
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (!recoveryTokens || !recoveryTokens.accessToken || !recoveryTokens.refreshToken) {
      showError('This reset link is missing required session tokens.');
    } else if (recoveryTokens.type !== 'recovery') {
      showError('This link is not a password recovery link.');
    } else {
      resetForm.classList.remove('hidden');
    }

    resetForm.addEventListener('submit', function (event) {
      event.preventDefault();
      clearFormError();

      var passwordInput = document.getElementById('password');
      var confirmInput = document.getElementById('confirm');
      var password = passwordInput.value;
      var confirm = confirmInput.value;

      if (password.length < 6) {
        showFormError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirm) {
        showFormError('Passwords do not match.');
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Updating…';

      fetch('/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + recoveryTokens.accessToken,
        },
        body: JSON.stringify({
          refreshToken: recoveryTokens.refreshToken,
          password: password,
        }),
      })
        .then(function (response) {
          return response.json().then(function (body) {
            return { ok: response.ok, body: body };
          });
        })
        .then(function (result) {
          if (!result.ok) {
            showFormError(result.body && result.body.error ? String(result.body.error) : 'Password update failed.');
            submitButton.disabled = false;
            submitButton.textContent = 'Update password';
            return;
          }

          resetForm.classList.add('hidden');
          successPanel.classList.remove('hidden');

          return notifyExtension(result.body).then(function (delivered) {
            if (delivered) {
              successMessage.textContent = 'Password updated. Returning to EdAIX…';
              window.close();
              return;
            }
            if (extensionId) {
              successMessage.textContent =
                'Password updated. Open the EdAIX extension from your browser toolbar to continue.';
            }
          });
        })
        .catch(function () {
          showFormError('Network error. Please try again.');
          submitButton.disabled = false;
          submitButton.textContent = 'Update password';
        });
    });
  })();
  </script>
</body>
</html>`
}

/**
 * Signup-confirmation bridge page. Supabase redirects here with session tokens in the
 * URL hash after the user verifies their email; the page optionally messages the
 * extension (externally_connectable) with the confirmed session.
 */
export function buildSignupConfirmBridgeHtml(extensionId: string | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Confirm email — EdAIX</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.25rem; margin: 0 0 1rem; text-align: center; }
    p { margin: 0 0 1rem; line-height: 1.5; text-align: center; }
    .hidden { display: none; }
    .error { color: #b00020; text-align: center; }
    .success { color: #0d652d; }
    button { font: inherit; font-size: 1rem; padding: 0.75rem 1.25rem; cursor: pointer; }
  </style>
</head>
<body>
  <div id="loading-panel">
    <h1>Confirming your email…</h1>
    <p id="status">Please wait while we finish setting up your EdAIX account.</p>
  </div>
  <div id="error-panel" class="hidden">
    <h1>Confirmation link invalid</h1>
    <p id="error-message" class="error"></p>
    <p>Request a new confirmation email from the EdAIX extension and try again.</p>
  </div>
  <div id="success-panel" class="hidden success">
    <h1>Email confirmed</h1>
    <p id="success-message">You can close this tab and return to EdAIX.</p>
    <button id="retry" class="hidden" type="button">Return to EdAIX</button>
  </div>
  <script>
  (function () {
    var extensionId = ${JSON.stringify(extensionId)};
    var loadingPanel = document.getElementById('loading-panel');
    var status = document.getElementById('status');
    var errorPanel = document.getElementById('error-panel');
    var errorMessage = document.getElementById('error-message');
    var successPanel = document.getElementById('success-panel');
    var successMessage = document.getElementById('success-message');
    var retry = document.getElementById('retry');
    var signupTokens = null;

    function showError(message) {
      loadingPanel.classList.add('hidden');
      errorMessage.textContent = message;
      errorPanel.classList.remove('hidden');
      successPanel.classList.add('hidden');
    }

    function showSuccess(message) {
      loadingPanel.classList.add('hidden');
      successMessage.textContent = message;
      successPanel.classList.remove('hidden');
    }

    function parseHash() {
      var hash = window.location.hash.replace(/^#/, '');
      if (!hash) return null;
      var params = new URLSearchParams(hash);
      return {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token'),
        type: params.get('type'),
      };
    }

    function notifyExtension(payload) {
      if (!extensionId) return Promise.resolve(false);
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        return Promise.resolve(false);
      }
      return new Promise(function (resolve) {
        chrome.runtime.sendMessage(
          extensionId,
          { type: 'JI_SIGNUP_COMPLETE', user: payload.user, session: payload.session },
          function (response) {
            if (chrome.runtime.lastError || !response || !response.ok) {
              resolve(false);
              return;
            }
            resolve(true);
          }
        );
      });
    }

    function returnToExtension() {
      if (!signupTokens) return;
      fetch('/auth/me', {
        headers: { Authorization: 'Bearer ' + signupTokens.accessToken },
      })
        .then(function (response) {
          return response.json().then(function (body) {
            return { ok: response.ok, body: body };
          });
        })
        .then(function (result) {
          if (!result.ok || !result.body || !result.body.user) {
            showError('Could not load your account after confirmation.');
            return;
          }

          var session = {
            accessToken: signupTokens.accessToken,
            refreshToken: signupTokens.refreshToken,
          };

          return notifyExtension({ user: result.body.user, session: session }).then(function (delivered) {
            if (delivered) {
              showSuccess('Email confirmed. Returning to EdAIX…');
              window.close();
              return;
            }
            if (extensionId) {
              showSuccess('Email confirmed. Open the EdAIX extension from your browser toolbar to continue.');
              retry.classList.remove('hidden');
            } else {
              showSuccess('Email confirmed. You can close this tab and sign in to EdAIX.');
            }
          });
        })
        .catch(function () {
          showError('Network error. Please try again.');
        });
    }

    signupTokens = parseHash();
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (!signupTokens || !signupTokens.accessToken || !signupTokens.refreshToken) {
      showError('This confirmation link is missing required session tokens.');
    } else if (signupTokens.type !== 'signup') {
      showError('This link is not a signup confirmation link.');
    } else {
      returnToExtension();
    }

    retry.addEventListener('click', returnToExtension);
  })();
  </script>
</body>
</html>`
}
