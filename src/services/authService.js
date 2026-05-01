const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const config = require('../config');
const { ApiError } = require('../middlewares/error');
const emailService = require('./emailService');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || null,
    phoneCountry: user.phoneCountry || null,
    role: user.role,
    blocked: user.blocked || false,
    pushEnabled: user.pushEnabled,
    orderNotificationsEnabled: user.orderNotificationsEnabled,
    emailNotificationsEnabled: user.emailNotificationsEnabled ?? false,
  };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(401, 'Ungültige Zugangsdaten');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new ApiError(401, 'Ungültige Zugangsdaten');
  if (user.blocked) throw new ApiError(403, 'Ihr Konto wurde gesperrt. Bitte kontaktieren Sie das Restaurant.');
  return { token: signToken(user), user: publicUser(user) };
}

async function register({ name, email, password, phone, phoneCountry }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'E-Mail bereits in Verwendung');
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name, email, password: hashed,
      phone: phone || null,
      phoneCountry: phoneCountry || null,
      role: 'CUSTOMER',
    },
  });
  return { token: signToken(user), user: publicUser(user) };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'Nutzer nicht gefunden');
  return publicUser(user);
}

async function updateProfile(userId, { name, email, phone, phoneCountry }) {
  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) throw new ApiError(409, 'E-Mail bereits in Verwendung');
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(phoneCountry !== undefined ? { phoneCountry: phoneCountry || null } : {}),
    },
  });
  return publicUser(user);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'Nutzer nicht gefunden');
  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw new ApiError(400, 'Aktuelles Passwort ist falsch');
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  return { ok: true };
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Silent success to prevent email enumeration

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await prisma.user.update({
    where: { id: user.id },
    data: { resetCode: code, resetCodeExpiry: expiry }
  });

  const subject = 'Passwort zurücksetzen';
  const html = `
    <h2>Passwort zurücksetzen</h2>
    <p>Hallo ${user.name},</p>
    <p>Sie haben angefordert, Ihr Passwort zurückzusetzen. Ihr Code lautet:</p>
    <h3 style="font-size: 24px; letter-spacing: 2px;">${code}</h3>
    <p>Dieser Code ist 15 Minuten lang gültig.</p>
    <p>Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren.</p>
  `;
  
  // Try sending, but ignore errors if email transport isn't set up perfectly
  try {
    await emailService.send({
      to: email,
      subject,
      html
    });
  } catch (err) {
    console.error('Password reset email failed:', err);
  }
}

async function resetPassword(email, code, newPassword) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.resetCode !== code) {
    throw new ApiError(400, 'Falscher oder abgelaufener Code');
  }
  
  if (new Date() > user.resetCodeExpiry) {
    throw new ApiError(400, 'Falscher oder abgelaufener Code');
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      password: hashed,
      resetCode: null,
      resetCodeExpiry: null 
    }
  });
}

async function updateNotificationPrefs(userId, { pushEnabled, orderNotificationsEnabled, emailNotificationsEnabled }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(pushEnabled !== undefined ? { pushEnabled } : {}),
      ...(orderNotificationsEnabled !== undefined ? { orderNotificationsEnabled } : {}),
      ...(emailNotificationsEnabled !== undefined ? { emailNotificationsEnabled } : {}),
    },
  });
  return publicUser(user);
}

module.exports = {
  login, register, getMe,
  updateProfile, changePassword, updateNotificationPrefs,
  forgotPassword, resetPassword,
  signToken, publicUser,
};
