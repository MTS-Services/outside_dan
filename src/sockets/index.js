const { Server } = require('socket.io');
const config = require('../config');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientUrl, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    // Kitchen / admin clients join "kitchen" room to receive new-order alerts
    socket.on('join:kitchen', () => socket.join('kitchen'));
    // Customers join their order room to receive status updates
    socket.on('join:order', (orderId) => {
      if (typeof orderId === 'string') socket.join(`order:${orderId}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocket, getIO };
