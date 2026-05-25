const prisma = require('../config/prisma');
const { ApiError } = require('../middlewares/error');

// ---- Public menu ---------------------------------------------------------

async function listCategoriesWithItems({ online = null } = {}) {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
        where: {
          isAvailable: true,
          ...(online === true ? { isOnline: true } : {}),
          ...(online === false ? { isOnline: false } : {}),
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          tags: { include: { tag: true } },
          extras: { include: { extra: true } },
        },
      },
    },
  });
}

async function listAllTagsPublic() {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } });
}

// ---- Categories -----------------------------------------------------------

async function listSliderItems() {
  return prisma.menuItem.findMany({
    where: { showInSlider: true, isAvailable: true },
    orderBy: { sliderSortOrder: 'asc' },
    select: {
      id: true, name: true, description: true, price: true, imageUrl: true,
      sliderSortOrder: true,
      category: { select: { id: true, name: true } },
      extras: { include: { extra: true } },
    },
  });
}

async function setSliderVisibility(id, showInSlider, sliderSortOrder) {
  return prisma.menuItem.update({
    where: { id },
    data: { showInSlider, sliderSortOrder: sliderSortOrder ?? 0 },
  });
}

async function listAllCategories() {
  return prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
}

async function listHomeCategories() {
  return prisma.category.findMany({
    where: { showOnHome: true, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true, homeImageUrl: true, imageUrl: true, sortOrder: true },
  });
}

async function createCategory(data) {
  return prisma.category.create({ data });
}

async function updateCategory(id, data) {
  return prisma.category.update({ where: { id }, data });
}

async function deleteCategory(id) {
  await prisma.category.delete({ where: { id } });
}

// ---- Tags -----------------------------------------------------------------

async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } });
}
async function createTag(data) { return prisma.tag.create({ data }); }
async function updateTag(id, data) { return prisma.tag.update({ where: { id }, data }); }
async function deleteTag(id) { await prisma.tag.delete({ where: { id } }); }

// ---- Extras ---------------------------------------------------------------

async function listExtras() { return prisma.extra.findMany({ orderBy: { name: 'asc' } }); }
async function createExtra(data) { return prisma.extra.create({ data }); }
async function updateExtra(id, data) { return prisma.extra.update({ where: { id }, data }); }
async function deleteExtra(id) { await prisma.extra.delete({ where: { id } }); }

// ---- Menu items -----------------------------------------------------------

const ITEM_INCLUDE = {
  category: true,
  tags: { include: { tag: true } },
  extras: { include: { extra: true } },
};

async function listMenuItems({ search, categoryId, isOnline } = {}) {
  return prisma.menuItem.findMany({
    where: {
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(isOnline !== undefined ? { isOnline } : {}),
    },
    include: ITEM_INCLUDE,
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
  });
}

async function getMenuItem(id) {
  const item = await prisma.menuItem.findUnique({ where: { id }, include: ITEM_INCLUDE });
  if (!item) throw new ApiError(404, 'Artikel nicht gefunden');
  return item;
}

function _splitItemPayload(input) {
  const { tagIds = [], extraIds = [], ...rest } = input;
  return { rest, tagIds, extraIds };
}

async function createMenuItem(input) {
  const { rest, tagIds, extraIds } = _splitItemPayload(input);
  return prisma.menuItem.create({
    data: {
      ...rest,
      tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      extras: extraIds.length ? { create: extraIds.map((extraId) => ({ extraId })) } : undefined,
    },
    include: ITEM_INCLUDE,
  });
}

async function updateMenuItem(id, input) {
  const { rest, tagIds, extraIds } = _splitItemPayload(input);
  // Replace tag and extra associations
  await prisma.$transaction([
    prisma.menuItemTag.deleteMany({ where: { menuItemId: id } }),
    prisma.menuItemExtra.deleteMany({ where: { menuItemId: id } }),
    prisma.menuItem.update({ where: { id }, data: rest }),
    ...(tagIds.length ? [prisma.menuItemTag.createMany({ data: tagIds.map((tagId) => ({ menuItemId: id, tagId })) })] : []),
    ...(extraIds.length ? [prisma.menuItemExtra.createMany({ data: extraIds.map((extraId) => ({ menuItemId: id, extraId })) })] : []),
  ]);
  return getMenuItem(id);
}

async function deleteMenuItem(id) {
  await prisma.menuItem.delete({ where: { id } });
}

async function setMenuItemAvailability(id, isAvailable) {
  return prisma.menuItem.update({ where: { id }, data: { isAvailable }, include: ITEM_INCLUDE });
}

module.exports = {
  // public
  listCategoriesWithItems, listAllTagsPublic, listHomeCategories, listSliderItems,
  // categories
  listAllCategories, createCategory, updateCategory, deleteCategory,
  // slider
  setSliderVisibility,
  // tags
  listTags, createTag, updateTag, deleteTag,
  // extras
  listExtras, createExtra, updateExtra, deleteExtra,
  // items
  listMenuItems, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem,
  setMenuItemAvailability,
};
