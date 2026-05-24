const paypal = require('../services/paypalService');
const { ApiError } = require('../middlewares/error');

async function config(req, res) {
  res.json({
    clientId: paypal.clientId(),
    currency: paypal.currency(),
    configured: paypal.isConfigured(),
  });
}

/** Create a PayPal Order. Returns { id }. The actual restaurant order is created
 *  AFTER the buyer captures, in /capture. */
async function createOrder(req, res) {
  if (!paypal.isConfigured()) throw new ApiError(503, 'PayPal ist nicht konfiguriert');
  const { amount } = req.body;
  const r = await paypal.createOrder({ amount });
  res.json({ id: r.id, status: r.status });
}

async function captureOrder(req, res) {
  if (!paypal.isConfigured()) throw new ApiError(503, 'PayPal ist nicht konfiguriert');
  const { paypalOrderId } = req.body;
  if (!paypalOrderId) throw new ApiError(400, 'paypalOrderId fehlt');
  const cap = await paypal.captureOrder(paypalOrderId);
  if (!paypal.isCaptureSuccessful(cap)) throw new ApiError(402, 'Zahlung fehlgeschlagen');
  res.json({
    success: true,
    paypalOrderId,
    captureId: paypal.getCaptureId(cap),
    amount: paypal.getCaptureAmount(cap),
  });
}

module.exports = { config, createOrder, captureOrder };
