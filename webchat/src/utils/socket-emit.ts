// Utility to emit socket event after saving a message
import io from 'socket.io-client';

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';

export function emitNewMessage(senderName?: string) {
  try {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('new-message', senderName);
    setTimeout(() => socket.disconnect(), 500); // disconnect after emit
  } catch {}
}
