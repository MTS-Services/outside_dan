/**
 * ready2order OAuth flow + admin endpoints.
 *
 * Endpoints:
 *   GET  /api/r2o/auth       – Start OAuth: calls r2o API → redirects browser to grantAccessUri
 *   GET  /api/r2o/callback   – r2o redirects here after approval with ?accountToken=...
 *   GET  /api/r2o/status     – Returns whether the integration is currently configured
 *   GET  /api/r2o/products   – Proxy: list products from r2o (requires account token)
 */
const router = require('express').Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { authRequired, requireAdmin } = require('../middlewares/auth');

const ENV_PATH = path.resolve(__dirname, '../../.env');
const R2O_BASE = process.env.R2O_BASE_URL || 'https://api.ready2order.com/v1';
const CALLBACK_URI = 'http://localhost:4000/api/r2o/callback';

// ─── GET /api/r2o/status ──────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const configured = Boolean(
    process.env.R2O_API_KEY && process.env.R2O_API_KEY !== 'your-ready2order-account-token'
  );
  res.json({
    configured,
    baseUrl: R2O_BASE,
    callbackUri: CALLBACK_URI,
    hasDevToken: Boolean(process.env.R2O_DEVELOPER_TOKEN),
  });
});

// ─── GET /api/r2o/auth ────────────────────────────────────────────────────────
// Visit this URL in your browser to kick off the OAuth flow.
router.get('/auth', async (req, res) => {
  const devToken = process.env.R2O_DEVELOPER_TOKEN;
  if (!devToken) {
    return res.status(500).json({ error: 'R2O_DEVELOPER_TOKEN not set in .env' });
  }

  try {
    const { data } = await axios.post(
      `${R2O_BASE}/developerToken/grantAccessToken`,
      { authorizationCallbackUri: CALLBACK_URI },
      {
        headers: {
          Authorization: `Bearer ${devToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      }
    );

    if (!data.grantAccessUri) {
      return res.status(502).json({ error: 'No grantAccessUri returned', detail: data });
    }

    // Redirect the browser to the ready2order approval page
    return res.redirect(data.grantAccessUri);
  } catch (err) {
    const detail = err.response?.data || err.message;
    return res.status(502).json({ error: 'Failed to get grant token', detail });
  }
});

// ─── GET /api/r2o/callback ────────────────────────────────────────────────────
// ready2order redirects here after the merchant approves (or denies) access.
// Query params: accountToken, grantAccessToken, status
router.get('/callback', (req, res) => {
  const { accountToken, status } = req.query;

  if (status === 'denied' || !accountToken) {
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;padding:2rem">
        <h2 style="color:#c00">Access Denied</h2>
        <p>The ready2order account owner denied access, or no token was returned.</p>
        <p>Status: <code>${status || 'unknown'}</code></p>
        <p>Go back and try <a href="/api/r2o/auth">starting the auth flow</a> again.</p>
      </body></html>
    `);
  }

  // Persist the account token into .env
  try {
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');
    if (envContent.includes('R2O_API_KEY=')) {
      envContent = envContent.replace(/^R2O_API_KEY=.*/m, `R2O_API_KEY=${accountToken}`);
    } else {
      envContent += `\nR2O_API_KEY=${accountToken}\n`;
    }
    fs.writeFileSync(ENV_PATH, envContent, 'utf8');

    // Update the running process env so the service picks it up immediately
    process.env.R2O_API_KEY = accountToken;
  } catch (fsErr) {
    return res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:2rem">
        <h2 style="color:#c00">File Write Error</h2>
        <p>Could not save account token to .env: ${fsErr.message}</p>
        <p>Manually set <code>R2O_API_KEY=${accountToken}</code> in your .env and restart the server.</p>
      </body></html>
    `);
  }

  return res.send(`
    <html><body style="font-family:sans-serif;padding:2rem;max-width:600px">
      <h2 style="color:#2a7">ready2order Connected!</h2>
      <p>Account token saved to <code>.env</code>.</p>
      <p><strong>Restart the backend server</strong> so the config module picks up the new token.</p>
      <hr/>
      <p>You can verify the connection at:
        <a href="/api/r2o/status">/api/r2o/status</a>
      </p>
      <p><small>Token (first 20 chars): <code>${accountToken.slice(0, 20)}…</code></small></p>
    </body></html>
  `);
});

// ─── GET /api/r2o/products ────────────────────────────────────────────────────
// Quick smoke-test: list products from the linked r2o account.
router.get('/products', async (req, res) => {
  const apiKey = process.env.R2O_API_KEY;
  if (!apiKey || apiKey === 'your-ready2order-account-token') {
    return res.status(503).json({ error: 'ready2order not configured. Run /api/r2o/auth first.' });
  }
  try {
    const { data } = await axios.get(`${R2O_BASE}/products`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      timeout: 15000,
    });
    return res.json(data);
  } catch (err) {
    const detail = err.response?.data || err.message;
    return res.status(502).json({ error: 'Failed to fetch products', detail });
  }
});

// ─── GET /api/r2o/vat-rates ───────────────────────────────────────────────────
// Returns VAT rates from the linked r2o account (admin only).
router.get('/vat-rates', [authRequired, requireAdmin], async (req, res) => {
  const apiKey = process.env.R2O_API_KEY;
  if (!apiKey || apiKey === 'your-ready2order-account-token') {
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
