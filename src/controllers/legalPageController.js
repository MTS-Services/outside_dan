const legalPageService = require('../services/legalPageService');

async function getPublicList(req, res) {
  res.json(await legalPageService.listPublicLegalPages());
}

async function getPublicPage(req, res) {
  res.json(await legalPageService.getPublicLegalPage(req.params.slug));
}

async function getAll(req, res) {
  res.json(await legalPageService.listAllLegalPages());
}

async function create(req, res) {
  res.status(201).json(await legalPageService.createLegalPage(req.body));
}

async function update(req, res) {
  res.json(await legalPageService.updateLegalPage(req.params.id, req.body));
}

async function remove(req, res) {
  await legalPageService.deleteLegalPage(req.params.id);
  res.status(204).end();
}

module.exports = {
  getPublicList,
  getPublicPage,
  getAll,
  create,
  update,
  remove,
};
