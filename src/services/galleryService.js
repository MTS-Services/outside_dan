const prisma = require('../config/prisma');

async function listAll() {
  return prisma.galleryImage.findMany({ orderBy: { sortOrder: 'asc' } });
}

async function listHome() {
  return prisma.galleryImage.findMany({
    where: { showOnHome: true },
    orderBy: { sortOrder: 'asc' },
    take: 3,
  });
}

async function create({ url, alt, sortOrder, showOnHome }) {
  return prisma.galleryImage.create({
    data: {
      url,
      alt: alt || null,
      sortOrder: sortOrder ?? 0,
      showOnHome: showOnHome === true,
    },
  });
}

async function update(id, { alt, sortOrder, showOnHome }) {
  return prisma.galleryImage.update({
    where: { id },
    data: {
      ...(alt !== undefined && { alt }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      ...(showOnHome !== undefined && { showOnHome }),
    },
  });
}

async function remove(id) {
  return prisma.galleryImage.delete({ where: { id } });
}

async function reorder(items) {
  // items: [{ id, sortOrder }]
  await prisma.$transaction(
    items.map(({ id, sortOrder }) =>
      prisma.galleryImage.update({ where: { id }, data: { sortOrder } })
    )
  );
}

module.exports = { listAll, listHome, create, update, remove, reorder };
