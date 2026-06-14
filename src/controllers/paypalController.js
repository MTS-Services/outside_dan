const paypal = require('../services/paypalService');
const paypalConfig = require('../services/paypalConfigService');
const { ApiError } = require('../middlewares/error');

async function config(req, res) {
  await paypalConfig.ensureLoaded();
  res.json({
    clientId: await paypal.clientId(),
    currency: await paypal.currency(),
    configured: await paypal.isConfigured(),
    mode: paypalConfig.getModeSync(),
  });
}

/** Create a PayPal Order. Returns { id }. The actual restaurant order is created
 *  AFTER the buyer captures, in /capture. */
async function createOrder(req, res) {
  if (!(await paypal.isConfigured())) throw new ApiError(503, 'PayPal ist nicht konfiguriert');
  const { amount } = req.body;
  const r = await paypal.createOrder({ amount });
  res.json({ id: r.id, status: r.status });
}

async function captureOrder(req, res) {
  if (!(await paypal.isConfigured())) throw new ApiError(503, 'PayPal ist nicht konfiguriert');
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

async function status(req, res) {
  res.json(await paypalConfig.getStatus());
}

async function saveConfig(req, res) {
  const { clientId, clientSecret, mode, currency } = req.body || {};
  if (!clientId || !String(clientId).trim()) throw new ApiError(400, 'Client ID ist erforderlich');

  const status = await paypalConfig.getStatus();
  const hasSecret = clientSecret && String(clientSecret).trim();
  if (!hasSecret && !status.hasClientSecret) {
    throw new ApiError(400, 'Client Secret ist erforderlich');
  }

  try {
    const result = await paypalConfig.setConfig({ clientId, clientSecret, mode, currency });
    paypal.invalidateTokenCache();
    res.json(result);
  } catch (err) {
    throw new ApiError(400, err.message || 'Speichern fehlgeschlagen');
  }
}

async function disconnect(req, res) {
  await paypalConfig.clearConfig();
  paypal.invalidateTokenCache();
  res.json(await paypalConfig.getStatus());
}

module.exports = { config, createOrder, captureOrder, status, saveConfig, disconnect };
