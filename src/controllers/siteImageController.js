const svc = require('../services/siteImageService');

// GET /api/site-images/:key  — public
async function getImage(req, res, next) {
  try {
    const img = await svc.get(req.params.key);
    res.json(img || null);
  } catch (err) {
    next(err);
  }
}

// POST /api/site-images/:key  — admin, multipart upload
async function setImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    const img = await svc.upsert(req.params.key, url);
    res.json(img);
  } catch (err) {
    next(err);
  }
}

module.exports = { getImage, setImage };
