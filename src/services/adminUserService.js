const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { ApiError } = require('../middlewares/error');
const { publicUser } = require('./authService');

// ---- Subadmins ------------------------------------------------------------

async function listSubadmins({ search } = {}) {
  return prisma.user.findMany({
    where: {
      role: { in: ['SUBADMIN', 'STAFF'] },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      blocked: true, orderNotificationsEnabled: true, createdAt: true,
    },
  });
}

async function createSubadmin({ name, email, password, phone }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'E-Mail bereits in Verwendung');
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name, email, password: hashed, phone: phone || null, role: 'SUBADMIN',
    },
  });
  return publicUser(user);
}

async function updateSubadmin(id, { name, email, phone, blocked }) {
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) throw new ApiError(404, 'Nicht gefunden');
  if (u.role === 'ADMIN') throw new ApiError(403, 'Admin kann nicht bearbeitet werden');
  if (email && email !== u.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'E-Mail bereits in Verwendung');
  }
  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(blocked !== undefined && { blocked }),
    },
    select: { id: true, name: true, email: true, phone: true, role: true, blocked: true, createdAt: true },
  });
  return updated;
}

async function deleteSubadmin(id) {
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) throw new ApiError(404, 'Nicht gefunden');
  if (u.role === 'ADMIN') throw new ApiError(403, 'Admin kann nicht gelöscht werden');
  await prisma.user.delete({ where: { id } });
  return { ok: true };
}

// ---- Customers ------------------------------------------------------------

async function listCustomers({ search } = {}) {
  return prisma.user.findMany({
    where: {
      role: 'CUSTOMER',
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, phone: true, phoneCountry: true, blocked: true, createdAt: true,
      _count: { select: { orders: true } },
    },
  });
}

async function setUserBlocked(id, blocked) {
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) throw new ApiError(404, 'Nicht gefunden');
  if (u.role === 'ADMIN') throw new ApiError(403, 'Admin kann nicht gesperrt werden');
  const updated = await prisma.user.update({ where: { id }, data: { blocked } });
  return publicUser(updated);
}

module.exports = {
  listSubadmins, createSubadmin, updateSubadmin, deleteSubadmin,
  listCustomers, setUserBlocked,
};
