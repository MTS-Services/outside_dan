const prisma = require('../config/prisma');
const config = require('../config');
const emailService = require('./emailService');
const recaptchaService = require('./recaptchaService');

async function getAdminEmails() {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUBADMIN'] }, blocked: false, emailNotificationsEnabled: true },
    select: { email: true },
  });
  const emails = admins.map((a) => a.email).filter(Boolean);
  if (emails.length) return emails;
  return [config.smtp.from].filter(Boolean);
}

async function submit({ name, email, phone, subject, message, recaptchaToken }, remoteIp) {
  await recaptchaService.verify(recaptchaToken, remoteIp);

  const msg = await prisma.contactMessage.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      subject: subject?.trim() || null,
      message: message.trim(),
    },
  });

  const adminEmails = await getAdminEmails();
  emailService.sendContactToAdmin(msg, adminEmails).catch(() => {});

  return msg;
}

async function list({ page = 1, limit = 20, unreadOnly = false }) {
  const where = unreadOnly ? { isRead: false } : {};
  const [items, total, unreadCount] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);
  return { items, total, unreadCount, page, limit };
}

async function getById(id) {
  const msg = await prisma.contactMessage.findUnique({ where: { id } });
  if (!msg) return null;
  if (!msg.isRead) {
    await prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
    return { ...msg, isRead: true };
  }
  return msg;
}

async function markRead(id, isRead = true) {
  return prisma.contactMessage.update({ where: { id }, data: { isRead } });
}

async function remove(id) {
  await prisma.contactMessage.delete({ where: { id } });
  return { ok: true };
}

module.exports = { submit, list, getById, markRead, remove };
