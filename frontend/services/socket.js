import { io } from 'socket.io-client';
import { auth } from './firebase';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Refresh token on reconnect (Firebase tokens expire after 1 hour)
  socket.on('reconnect_attempt', async () => {
    const freshToken = await auth.currentUser?.getIdToken(true);
    if (freshToken) socket.auth.token = freshToken;
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
