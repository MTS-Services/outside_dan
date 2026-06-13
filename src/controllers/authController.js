const authService = require('../services/authService');

async function login(req, res) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(result);
}

async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

async function resendVerification(req, res) {
  await authService.resendVerification(req.body.email);
  res.json({ message: 'Bestätigungscode wurde gesendet' });
}

async function verifyEmail(req, res) {
  const result = await authService.verifyEmail(req.body.email, req.body.code);
  res.json(result);
}

async function me(req, res) {
  res.json({ user: await authService.getMe(req.user.sub) });
}

async function updateProfile(req, res) {
  res.json({ user: await authService.updateProfile(req.user.sub, req.body) });
}

async function forgotPassword(req, res) {
  await authService.forgotPassword(req.body.email);
  res.json({ message: 'Code wurde an Ihre E-Mail gesendet' });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body.email, req.body.code, req.body.newPassword);
  res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
}

async function changePassword(req, res) {
  res.json(await authService.changePassword(req.user.sub, req.body));
}

async function updateNotificationPrefs(req, res) {
  res.json({ user: await authService.updateNotificationPrefs(req.user.sub, req.body) });
}

module.exports = { login, register, me, updateProfile, changePassword, updateNotificationPrefs, forgotPassword, resetPassword, resendVerification, verifyEmail };
