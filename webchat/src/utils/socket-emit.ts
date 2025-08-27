// Utility to emit socket event after saving a message
import io from 'socket.io-client';

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';

export function emitNewMessage() {
  try {
  const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('new-message');
    setTimeout(() => socket.disconnect(), 500); // disconnect after emit
  } catch {}
}
