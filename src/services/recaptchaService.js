const axios = require('axios');
const config = require('../config');
const { ApiError } = require('../middlewares/error');

function isConfigured() {
  return Boolean(config.recaptcha.secretKey?.trim());
}

function isEnabled() {
  return Boolean(config.recaptcha.siteKey?.trim() && config.recaptcha.secretKey?.trim());
}

async function verify(token, remoteIp) {
  if (!isConfigured()) {
    if (config.nodeEnv === 'development') return { ok: true, skipped: true };
    throw new ApiError(503, 'reCAPTCHA ist nicht konfiguriert');
  }
  if (!token?.trim()) {
    throw new ApiError(400, 'Bitte bestätige, dass du kein Roboter bist.');
  }

  try {
    const params = new URLSearchParams({
      secret: config.recaptcha.secretKey.trim(),
      response: token.trim(),
    });
    if (remoteIp) params.set('remoteip', remoteIp);

    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      },
    );

    if (!data.success) {
      throw new ApiError(400, 'reCAPTCHA-Verifizierung fehlgeschlagen. Bitte erneut versuchen.');
    }

    if (typeof data.score === 'number' && data.score < 0.5) {
      throw new ApiError(400, 'reCAPTCHA-Verifizierung fehlgeschlagen. Bitte erneut versuchen.');
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, 'reCAPTCHA konnte nicht geprüft werden. Bitte später erneut versuchen.');
  }
}

module.exports = { verify, isConfigured, isEnabled };
