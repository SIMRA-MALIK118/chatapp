import { io } from 'socket.io-client';
import { auth } from './firebase';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 10000,
  });

  // Refresh token on reconnect (Firebase tokens expire after 1 hour)
  socket.on('reconnect_attempt', async () => {
    const freshToken = await auth.currentUser?.getIdToken(true);
    if (freshToken) socket.auth.token = freshToken;
  });

  socket.on('connect', () => console.log('Socket connected:', socket.id));
  socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
  socket.on('connect_error', (err) => console.log('Socket error:', err.message));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
