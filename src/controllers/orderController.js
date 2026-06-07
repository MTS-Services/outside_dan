const orderService = require('../services/orderService');
const distanceService = require('../services/distanceService');

async function create(req, res) {
  const userId = req.user?.sub || null;
  const order = await orderService.createOrder(req.body, userId);
  res.status(201).json(order);
}

async function list(req, res) {
  const { status, search, page, pageSize, statusIn, userId } = req.query;
  res.json(await orderService.listOrders({
    status,
    search,
    page,
    pageSize,
    statusIn: statusIn ? String(statusIn).split(',') : undefined,
    userId: userId || undefined,
  }));
}

async function mine(req, res) {
  res.json(await orderService.listMineByUser(req.user.sub));
}

async function getOne(req, res) {
  res.json(await orderService.getOrder(req.params.id));
}

async function accept(req, res) {
  res.json(await orderService.acceptOrder(req.params.id, {
    acceptanceNote: req.body?.acceptanceNote,
    userId: req.user?.sub,
  }));
}

async function decline(req, res) {
  res.json(await orderService.declineOrder(req.params.id, req.body?.reason));
}

async function setStatus(req, res) {
  res.json(await orderService.updateStatus(req.params.id, req.body.status));
}

async function reprint(req, res) {
  res.json(await orderService.reprintTicket(req.params.id));
}

async function edit(req, res) {
  res.json(await orderService.editOrder(req.params.id, req.body, {
    userId: req.user?.sub, role: req.user?.role,
  }));
}

async function dashboard(req, res) {
  res.json(await orderService.dashboardStats());
}

async function driveTime(req, res) {
  const order = await orderService.getOrder(req.params.id);
  const info = await distanceService.getDriveTimeForOrder(order);
  res.json(info);
}

module.exports = { create, list, mine, getOne, accept, decline, setStatus, reprint, edit, dashboard, driveTime };
