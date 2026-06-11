/**
 * PayPal Orders v2 REST integration (server-side).
 * Two endpoints used:
 *   - POST /v2/checkout/orders                  (create)
 *   - POST /v2/checkout/orders/{id}/capture    (capture after buyer approves)
 */
const axios = require('axios');
const config = require('../config');

const BASE = config.paypal.mode === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

let _token = null;
let _tokenExp = 0;

function isConfigured() {
  return Boolean(config.paypal.clientId && config.paypal.clientSecret);
}

async function getAccessToken() {
  if (!isConfigured()) throw new Error('PayPal not configured');
  if (_token && Date.now() < _tokenExp - 30_000) return _token;
  const auth = Buffer.from(`${config.paypal.clientId}:${config.paypal.clientSecret}`).toString('base64');
  const { data } = await axios.post(
    `${BASE}/v1/oauth2/token`,
    'grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  _token = data.access_token;
  _tokenExp = Date.now() + data.expires_in * 1000;
  return _token;
}

/** Create a PayPal order. Returns { id, status, links }. */
async function createOrder({ amount, currency = config.paypal.currency, reference }) {
  const tok = await getAccessToken();
  const { data } = await axios.post(
    `${BASE}/v2/checkout/orders`,
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: reference || 'rr-order',
          amount: {
            currency_code: currency,
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
  const { data } = await axios.post(
    `${BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
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
  const body = {};
  if (amount) {
    body.amount = { currency_code: currency || config.paypal.currency, value: Number(amount).toFixed(2) };
  }
  if (note) body.note_to_payer = String(note).slice(0, 255);
  const { data } = await axios.post(
    `${BASE}/v2/payments/captures/${captureId}/refund`,
    body,
    { headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' } }
  );
  return data; // { id, status: 'COMPLETED'|'PENDING', ... }
}

module.exports = {
  isConfigured,
  createOrder,
  captureOrder,
  refundCapture,
  getCaptureId,
  getCaptureAmount,
  isCaptureSuccessful,
  clientId: () => config.paypal.clientId,
  currency: () => config.paypal.currency,
};
