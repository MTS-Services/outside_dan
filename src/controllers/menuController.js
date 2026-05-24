const menuService = require('../services/menuService');

async function getSliderItems(req, res) {
  res.json(await menuService.listSliderItems());
}

async function setSliderItem(req, res) {
  const { showInSlider, sliderSortOrder } = req.body;
  res.json(await menuService.setSliderVisibility(req.params.id, !!showInSlider, sliderSortOrder));
}

async function getHomeCategories(req, res) {
  res.json(await menuService.listHomeCategories());
}

async function getPublicMenu(req, res) {
  let online = null;
  if (req.query.online === 'true') online = true;
  else if (req.query.online === 'false') online = false;
  const data = await menuService.listCategoriesWithItems({ online });
  res.json(data);
}

async function getPublicTags(req, res) { res.json(await menuService.listAllTagsPublic()); }

async function getCategories(req, res) { res.json(await menuService.listAllCategories()); }
async function createCategory(req, res) { res.status(201).json(await menuService.createCategory(req.body)); }
async function updateCategory(req, res) { res.json(await menuService.updateCategory(req.params.id, req.body)); }
async function deleteCategory(req, res) { await menuService.deleteCategory(req.params.id); res.status(204).end(); }

async function getMenuItems(req, res) {
  res.json(await menuService.listMenuItems({
    search: req.query.search,
    categoryId: req.query.categoryId,
    isOnline: req.query.isOnline === 'true' ? true : (req.query.isOnline === 'false' ? false : undefined),
  }));
}
async function createMenuItem(req, res) { res.status(201).json(await menuService.createMenuItem(req.body)); }
async function updateMenuItem(req, res) { res.json(await menuService.updateMenuItem(req.params.id, req.body)); }
async function deleteMenuItem(req, res) { await menuService.deleteMenuItem(req.params.id); res.status(204).end(); }
async function setItemAvailability(req, res) {
  res.json(await menuService.setMenuItemAvailability(req.params.id, !!req.body.isAvailable));
}

async function uploadImage(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
}

// Image-from-URL: download then save under /uploads
async function uploadImageFromUrl(req, res) {
  const axios = require('axios');
  const fs = require('fs');
  const path = require('path');
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL fehlt' });
  try {
    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    const ct = (resp.headers['content-type'] || '').split(';')[0];
    const ext = (ct.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const filePath = path.join(__dirname, '..', '..', 'uploads', name);
    fs.writeFileSync(filePath, resp.data);
    res.status(201).json({ url: `/uploads/${name}` });
  } catch (err) {
    res.status(400).json({ error: 'Bild konnte nicht heruntergeladen werden' });
  }
}

// Tags
async function getTags(req, res) { res.json(await menuService.listTags()); }
async function createTag(req, res) { res.status(201).json(await menuService.createTag(req.body)); }
async function updateTag(req, res) { res.json(await menuService.updateTag(req.params.id, req.body)); }
async function deleteTag(req, res) { await menuService.deleteTag(req.params.id); res.status(204).end(); }
async function uploadTagImage(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/${req.file.filename}`;
  const tag = await menuService.updateTag(req.params.id, { imageUrl: url });
  res.json(tag);
}

// Extras
async function getExtras(req, res) { res.json(await menuService.listExtras()); }
async function createExtra(req, res) { res.status(201).json(await menuService.createExtra(req.body)); }
async function updateExtra(req, res) { res.json(await menuService.updateExtra(req.params.id, req.body)); }
async function deleteExtra(req, res) { await menuService.deleteExtra(req.params.id); res.status(204).end(); }

module.exports = {
  getSliderItems, setSliderItem,
  getHomeCategories,
  getPublicMenu, getPublicTags,
  getCategories, createCategory, updateCategory, deleteCategory,
  getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, setItemAvailability,
  uploadImage, uploadImageFromUrl,
  getTags, createTag, updateTag, deleteTag, uploadTagImage,
  getExtras, createExtra, updateExtra, deleteExtra,
};
