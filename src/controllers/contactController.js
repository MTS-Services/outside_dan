const contactService = require('../services/contactService');
const config = require('../config');
const recaptchaService = require('../services/recaptchaService');
const { ApiError } = require('../middlewares/error');

async function getConfig(req, res) {
  res.json({
    enabled: recaptchaService.isEnabled(),
    siteKey: config.recaptcha.siteKey || '',
    version: config.recaptcha.version === 'v3' ? 'v3' : 'v2',
  });
}

async function submit(req, res) {
  const msg = await contactService.submit(req.body, req.ip);
  res.status(201).json({ ok: true, id: msg.id });
}

async function list(req, res) {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const unreadOnly = req.query.unreadOnly === 'true';
  res.json(await contactService.list({ page, limit, unreadOnly }));
}

async function getOne(req, res) {
  const msg = await contactService.getById(req.params.id);
  if (!msg) throw new ApiError(404, 'Nachricht nicht gefunden');
  res.json(msg);
}

async function markRead(req, res) {
  const msg = await contactService.markRead(req.params.id, req.body.isRead !== false);
  res.json(msg);
}

async function remove(req, res) {
  await contactService.remove(req.params.id);
  res.json({ ok: true });
}

module.exports = { getConfig, submit, list, getOne, markRead, remove };
