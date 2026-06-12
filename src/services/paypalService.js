/**
 * PayPal Orders v2 REST integration (server-side).
 * Two endpoints used:
 *   - POST /v2/checkout/orders                  (create)
 *   - POST /v2/checkout/orders/{id}/capture    (capture after buyer approves)
 */
const axios = require('axios');
const paypalConfig = require('./paypalConfigService');

let _token = null;
let _tokenExp = 0;

function getApiBase(mode) {
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function isConfigured() {
  await paypalConfig.ensureLoaded();
  return paypalConfig.isKeyValid(paypalConfig.getClientIdSync())
    && paypalConfig.isKeyValid(paypalConfig.getClientSecretSync());
}

async function getAccessToken() {
  if (!(await isConfigured())) throw new Error('PayPal not configured');
  if (_token && Date.now() < _tokenExp - 30_000) return _token;

  const clientId = paypalConfig.getClientIdSync();
  const clientSecret = paypalConfig.getClientSecretSync();
  const base = getApiBase(paypalConfig.getModeSync());
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const { data } = await axios.post(
    `${base}/v1/oauth2/token`,
    'grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  _token = data.access_token;
  _tokenExp = Date.now() + data.expires_in * 1000;
  return _token;
}

/** Create a PayPal order. Returns { id, status, links }. */
async function createOrder({ amount, currency, reference }) {
  const tok = await getAccessToken();
  const resolvedCurrency = currency || paypalConfig.getCurrencySync();
  const base = getApiBase(paypalConfig.getModeSync());
  const { data } = await axios.post(
    `${base}/v2/checkout/orders`,
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: reference || 'rr-order',
          amount: {
            currency_code: resolvedCurrency,
            value: Number(amount).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'Tarantella Pizza Pasta Napoli',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    },
    { headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' } }
  );
  return data;
}

/** Capture a PayPal order. Returns full capture details on success. */
async function captureOrder(paypalOrderId) {
  const tok = await getAccessToken();
  const base = getApiBase(paypalConfig.getModeSync());
  const { data } = await axios.post(
    `${base}/v2/checkout/orders/${paypalOrderId}/capture`,
    {},
    { headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' } }
  );
  return data;
}

function getCaptureId(captureResp) {
  try {
    return captureResp.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
  } catch { return null; }
}

function getCaptureAmount(captureResp) {
  try {
    return captureResp.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || null;
  } catch { return null; }
}

function isCaptureSuccessful(captureResp) {
  try {
    const cap = captureResp.purchase_units?.[0]?.payments?.captures?.[0];
    return cap?.status === 'COMPLETED';
  } catch { return false; }
}

/** Refund a captured payment. Refunds the full amount if no amount is provided. */
async function refundCapture(captureId, { amount, currency, note } = {}) {
  const tok = await getAccessToken();
  const base = getApiBase(paypalConfig.getModeSync());
  const body = {};
  if (amount) {
    body.amount = {
      currency_code: currency || paypalConfig.getCurrencySync(),
      value: Number(amount).toFixed(2),
    };
  }
  if (note) body.note_to_payer = String(note).slice(0, 255);
  const { data } = await axios.post(
    `${base}/v2/payments/captures/${captureId}/refund`,
    body,
    { headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' } }
  );
  return data;
}

function invalidateTokenCache() {
  _token = null;
  _tokenExp = 0;
}

async function clientId() {
  await paypalConfig.ensureLoaded();
  return paypalConfig.getClientIdSync();
}

async function currency() {
  await paypalConfig.ensureLoaded();
  return paypalConfig.getCurrencySync();
}

module.exports = {
  isConfigured,
  createOrder,
  captureOrder,
  refundCapture,
  getCaptureId,
  getCaptureAmount,
  isCaptureSuccessful,
  invalidateTokenCache,
  clientId,
  currency,
};
