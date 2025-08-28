
import io from 'socket.io-client';
let socket: ReturnType<typeof io> | null = null;

export function getSocket(onConnect?: (id: string) => void, onDisconnect?: () => void) {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_URL || 'http://localhost:4000',
      {
        transports: ['websocket'],
        autoConnect: true,
      }
    );
    if (onConnect) socket.on('connect', () => onConnect(socket!.id));
    if (onDisconnect) socket.on('disconnect', onDisconnect);
  }
  return socket;
}
