import io from 'socket.io-client';

let socket: ReturnType<typeof io> | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_URL || 'http://localhost:4000',
      {
        transports: ['websocket'],
        autoConnect: true,
      }
    );
  }
  return socket;
}
