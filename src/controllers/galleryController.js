const path = require('path');
const fs = require('fs');
const gallery = require('../services/galleryService');

// GET /api/gallery — public, all or home-only
async function list(req, res) {
  const home = req.query.home === 'true';
  const images = home ? await gallery.listHome() : await gallery.listAll();
  res.json(images);
}

// POST /api/gallery — admin, upload image file
async function create(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Kein Bild hochgeladen' });
  const url = `/uploads/${req.file.filename}`;
  const { alt, sortOrder, showOnHome } = req.body;
  const image = await gallery.create({
    url,
    alt,
    sortOrder: sortOrder ? Number(sortOrder) : 0,
    showOnHome: showOnHome === 'true' || showOnHome === true,
  });
  res.status(201).json(image);
}

// PATCH /api/gallery/:id — admin, update meta
async function update(req, res) {
  const image = await gallery.update(req.params.id, req.body);
  res.json(image);
}

// DELETE /api/gallery/:id — admin
async function remove(req, res) {
  // Also delete the file from disk if it's a local upload
  const existing = await require('../config/prisma').galleryImage.findUnique({
    where: { id: req.params.id },
  });
  if (existing?.url?.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, '..', '..', existing.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await gallery.remove(req.params.id);
  res.json({ ok: true });
}

// PUT /api/gallery/reorder — admin
async function reorder(req, res) {
  await gallery.reorder(req.body); // [{ id, sortOrder }]
  res.json({ ok: true });
}

module.exports = { list, create, update, remove, reorder };
