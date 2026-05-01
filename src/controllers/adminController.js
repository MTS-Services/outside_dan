const adminUserService = require('../services/adminUserService');
const email = require('../services/emailService');
const prisma = require('../config/prisma');

async function listSubadmins(req, res) {
  res.json(await adminUserService.listSubadmins({ search: req.query.search }));
}
async function createSubadmin(req, res) {
  res.status(201).json(await adminUserService.createSubadmin(req.body));
}
async function updateSubadmin(req, res) {
  res.json(await adminUserService.updateSubadmin(req.params.id, req.body));
}
async function deleteSubadmin(req, res) {
  await adminUserService.deleteSubadmin(req.params.id);
  res.status(204).end();
}

async function listCustomers(req, res) {
  res.json(await adminUserService.listCustomers({ search: req.query.search }));
}
async function setUserBlocked(req, res) {
  res.json(await adminUserService.setUserBlocked(req.params.id, !!req.body.blocked));
}

async function testEmailNotification(req, res, next) {
  try {
    if (!email.isConfigured()) return res.status(400).json({ error: 'SMTP nicht konfiguriert.' });
    const address = req.user.email;
    if (!address) return res.status(400).json({ error: 'Kein E-Mail auf diesem Konto hinterlegt.' });
    const result = await email.sendTestEmailToAdmin(address);
    if (result?.error) return res.status(500).json({ error: result.error });
    if (result?.skipped) return res.status(400).json({ error: 'SMTP nicht konfiguriert (no transporter).' });
    res.json({ ok: true, sentTo: address });
  } catch (err) { next(err); }
}

module.exports = {
  listSubadmins, createSubadmin, updateSubadmin, deleteSubadmin,
  listCustomers, setUserBlocked,
  testEmailNotification,
};
