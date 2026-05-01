import { io } from 'socket.io-client';

const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(url, { transports: ['websocket'], autoConnect: true });
  }
  return socket;
}
