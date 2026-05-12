const prisma = require('../config/prisma');

async function get(key) {
  return prisma.siteImage.findUnique({ where: { key } });
}

async function upsert(key, url) {
  return prisma.siteImage.upsert({
    where: { key },
    update: { url },
    create: { key, url },
  });
}

module.exports = { get, upsert };
