/**
 * ready2order OAuth flow + admin pairing endpoints.
 */
const router = require('express').Router();
const axios = require('axios');
const config = require('../config');
const { authRequired, requireAdmin, requireStaff } = require('../middlewares/auth');
const r2oConfig = require('../services/r2oConfigService');
const r2o = require('../services/r2oService');

const R2O_BASE = config.r2o.baseUrl;

// ─── GET /api/r2o/status ──────────────────────────────────────────────────────
router.get('/status', authRequired, requireAdmin, async (req, res) => {
  res.json(await r2oConfig.getStatus());
});

// ─── PUT /api/r2o/developer-token ───────────────────────────────────────────
router.put('/developer-token', authRequired, requireAdmin, async (req, res) => {
  const { developerToken } = req.body || {};
  if (!developerToken || !String(developerToken).trim()) {
    return res.status(400).json({ error: 'Developer Token ist erforderlich' });
  }
  await r2oConfig.setDeveloperToken(developerToken);
  res.json(await r2oConfig.getStatus());
});

// ─── POST /api/r2o/grant-link ─────────────────────────────────────────────────
router.post('/grant-link', authRequired, requireAdmin, async (req, res) => {
  const devToken = await r2oConfig.getDeveloperToken();
  if (!r2oConfig.isKeyValid(devToken)) {
    return res.status(400).json({ error: 'Developer Token fehlt — bitte zuerst speichern' });
  }

  const callbackUri = r2oConfig.getCallbackUri();
  try {
    const { data } = await axios.post(
      `${R2O_BASE}/developerToken/grantAccessToken`,
      { authorizationCallbackUri: callbackUri },
      {
        headers: {
          Authorization: `Bearer ${devToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      },
    );

    if (!data.grantAccessUri) {
      return res.status(502).json({ error: 'Kein Verbindungslink erhalten', detail: data });
    }

    return res.json({
      grantAccessUri: data.grantAccessUri,
      grantAccessToken: data.grantAccessToken || null,
      expiresAt: data.expiresAt || null,
      callbackUri,
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    return res.status(502).json({ error: 'Verbindungslink konnte nicht erstellt werden', detail });
  }
});

// ─── PUT /api/r2o/account-token ───────────────────────────────────────────────
router.put('/account-token', authRequired, requireAdmin, async (req, res) => {
  const { accountToken } = req.body || {};
  if (!accountToken || !String(accountToken).trim()) {
    return res.status(400).json({ error: 'Account Token ist erforderlich' });
  }
  await r2oConfig.setApiKey(accountToken);
  r2o.resyncAllCouponsToR2o().catch((err) => {
    console.error('[r2o] Coupon resync after connect failed:', err.message);
  });
  res.json(await r2oConfig.getStatus());
});

// ─── DELETE /api/r2o/disconnect ───────────────────────────────────────────────
router.delete('/disconnect', authRequired, requireAdmin, async (req, res) => {
  await r2oConfig.clearApiKey();
  r2o.clearR2oAccountCaches();
  r2o.resetCouponR2oIds().catch((err) => {
    console.error('[r2o] Coupon id reset after disconnect failed:', err.message);
  });
  res.json(await r2oConfig.getStatus());
});

// ─── GET /api/r2o/auth ────────────────────────────────────────────────────────
router.get('/auth', authRequired, requireAdmin, async (req, res) => {
  const devToken = await r2oConfig.getDeveloperToken();
  if (!r2oConfig.isKeyValid(devToken)) {
    return res.status(400).json({ error: 'Developer Token fehlt — bitte im Admin unter ready2order speichern' });
  }

  try {
    const { data } = await axios.post(
      `${R2O_BASE}/developerToken/grantAccessToken`,
      { authorizationCallbackUri: r2oConfig.getCallbackUri() },
      {
        headers: {
          Authorization: `Bearer ${devToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      },
    );

    if (!data.grantAccessUri) {
      return res.status(502).json({ error: 'No grantAccessUri returned', detail: data });
    }

    return res.redirect(data.grantAccessUri);
  } catch (err) {
    const detail = err.response?.data || err.message;
    return res.status(502).json({ error: 'Failed to get grant token', detail });
  }
});

// ─── GET /api/r2o/callback ────────────────────────────────────────────────────
router.get('/callback', async (req, res) => {
  const { accountToken, status } = req.query;

  if (status === 'denied' || !accountToken) {
    const redirectUrl = `${config.clientUrl}/admin/r2o?error=denied`;
    return res.redirect(redirectUrl);
  }

  try {
    await r2oConfig.setApiKey(accountToken);
    r2o.resyncAllCouponsToR2o().catch((err) => {
      console.error('[r2o] Coupon resync after callback failed:', err.message);
    });
  } catch (err) {
    const redirectUrl = `${config.clientUrl}/admin/r2o?error=save&token=${encodeURIComponent(accountToken)}`;
    return res.redirect(redirectUrl);
  }

  return res.redirect(`${config.clientUrl}/admin/r2o?success=1`);
});

// ─── GET /api/r2o/products ────────────────────────────────────────────────────
router.get('/products', authRequired, requireAdmin, async (req, res) => {
  const apiKey = await r2oConfig.getApiKey();
  if (!r2oConfig.isKeyValid(apiKey)) {
    return res.status(503).json({ error: 'ready2order nicht verbunden' });
  }
  try {
    const { data } = await axios.get(`${R2O_BASE}/products`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      timeout: 15000,
    });
    return res.json(data);
  } catch (err) {
    const detail = err.response?.data || err.message;
    return res.status(502).json({ error: 'Produkte konnten nicht geladen werden', detail });
  }
});

// ─── GET /api/r2o/vat-rates ───────────────────────────────────────────────────
router.get('/vat-rates', [authRequired, requireStaff], async (req, res) => {
  const apiKey = await r2oConfig.getApiKey();
  if (!r2oConfig.isKeyValid(apiKey)) {
    return res.status(503).json({ error: 'ready2order not configured' });
  }
  try {
    const { data } = await axios.get(`${R2O_BASE}/vat-rates`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      timeout: 10000,
    });
    return res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    const detail = err.response?.data || err.message;
    return res.status(502).json({ error: 'VAT-Raten konnten nicht geladen werden', detail });
  }
});

module.exports = router;
