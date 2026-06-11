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

export function buildPasswordRecoveryRedirectUrl(apiBase: string, extensionId: string): string {
  const base = apiBase.replace(/\/+$/, '')
  return appendExtensionIdToUrl(`${base}${PASSWORD_RECOVERY_PAGE_PATH}`, extensionId)
}

/**
 * Stripe cancel bridge page. Chrome blocks script redirects to chrome-extension://,
 * so we ask the installed extension (via externally_connectable) to open purchase.html.
 */
export function buildCheckoutCancelBridgeHtml(extensionId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>EdAIX</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; text-align: center; color: #111; }
    .hidden { display: none; }
    button { font: inherit; font-size: 1rem; padding: 0.75rem 1.25rem; cursor: pointer; }
  </style>
</head>
<body>
  <p id="status">Returning to EdAIX…</p>
  <p id="fallback" class="hidden">Payment was cancelled. Open the EdAIX extension from your browser toolbar to continue.</p>
  <button id="retry" class="hidden" type="button">Try again</button>
  <script>
  (function () {
    var extensionId = ${JSON.stringify(extensionId)};
    var status = document.getElementById('status');
    var fallback = document.getElementById('fallback');
    var retry = document.getElementById('retry');

    function showFallback() {
      status.textContent = 'Could not open EdAIX automatically.';
      fallback.classList.remove('hidden');
      retry.classList.remove('hidden');
    }

    function returnToExtension() {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        showFallback();
        return;
      }
      document.body.style.visibility = 'hidden';
      chrome.runtime.sendMessage(
        extensionId,
        { type: 'JI_CHECKOUT_CANCEL_RETURN' },
        function (response) {
          if (chrome.runtime.lastError || !response || !response.ok) {
            document.body.style.visibility = '';
            showFallback();
            return;
          }
          window.close();
        }
      );
    }

    retry.addEventListener('click', returnToExtension);
    returnToExtension();
  })();
  </script>
</body>
</html>`
}

/**
 * Stripe success bridge page. Chrome blocks script redirects to chrome-extension://,
 * so we ask the installed extension (via externally_connectable) to open success.html.
 */
export function buildCheckoutSuccessBridgeHtml(extensionId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>EdAIX</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; text-align: center; color: #111; }
    .hidden { display: none; }
    button { font: inherit; font-size: 1rem; padding: 0.75rem 1.25rem; cursor: pointer; }
  </style>
</head>
<body>
  <p id="status">Payment successful. Returning to EdAIX…</p>
  <p id="fallback" class="hidden">Payment successful. Open the EdAIX extension from your browser toolbar to continue.</p>
  <button id="retry" class="hidden" type="button">Continue in EdAIX</button>
  <script>
  (function () {
    var extensionId = ${JSON.stringify(extensionId)};
    var status = document.getElementById('status');
    var fallback = document.getElementById('fallback');
    var retry = document.getElementById('retry');

    function showFallback() {
      status.textContent = 'Could not open EdAIX automatically.';
      fallback.classList.remove('hidden');
      retry.classList.remove('hidden');
    }

    function returnToExtension() {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        showFallback();
        return;
      }
      document.body.style.visibility = 'hidden';
      chrome.runtime.sendMessage(
        extensionId,
        { type: 'JI_CHECKOUT_SUCCESS_RETURN' },
        function (response) {
          if (chrome.runtime.lastError || !response || !response.ok) {
            document.body.style.visibility = '';
            showFallback();
            return;
          }
          window.close();
        }
      );
    }

    retry.addEventListener('click', returnToExtension);
    returnToExtension();
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
