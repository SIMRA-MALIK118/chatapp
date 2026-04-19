import { auth, db } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

export const initSocket = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized: no token'));
    try {
      socket.user = await auth.verifyIdToken(token);
      next();
    } catch {
      next(new Error('Unauthorized: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.user.uid;
    socket.join(uid);

    db.collection('users').doc(uid).update({
      online: true,
      lastSeen: new Date().toISOString(),
    }).catch(() => {});

    // ─── Send Message ─────────────────────────────────────────────────────────
    socket.on('sendMessage', async (message) => {
      io.to(message.receiverId).emit('newMessage', message);
      try {
        const receiverSockets = await io.in(message.receiverId).fetchSockets();
        if (receiverSockets.length > 0 && message.id) {
          await db.collection('messages').doc(message.id).update({ status: 'delivered' });
          io.to(message.senderId).emit('messageStatusUpdate', {
            messageId: message.id,
            status: 'delivered',
          });
        }
      } catch (err) {
        console.error('Delivered status error:', err);
      }
    });

    // ─── Typing ───────────────────────────────────────────────────────────────
    socket.on('typing', ({ receiverId }) => {
      io.to(receiverId).emit('typing', { senderId: uid });
    });
    socket.on('stopTyping', ({ receiverId }) => {
      io.to(receiverId).emit('stopTyping', { senderId: uid });
    });

    // ─── Message Seen ─────────────────────────────────────────────────────────
    socket.on('messageSeen', async ({ messageId, senderId }) => {
      try {
        await db.collection('messages').doc(messageId).update({ status: 'seen' });
        io.to(senderId).emit('messageStatusUpdate', { messageId, status: 'seen' });
      } catch (err) {
        console.error('Seen status error:', err);
      }
    });

    // ─── Bulk Seen (mark all msgs in a chat as seen when opening it) ──────────
    socket.on('bulkSeen', async ({ senderId }) => {
      try {
        const chatId = getChatId(uid, senderId);
        const snap = await db.collection('messages')
          .where('chatId', '==', chatId)
          .where('receiverId', '==', uid)
          .where('status', '!=', 'seen')
          .get();

        const batch = db.batch();
        snap.docs.forEach((d) => batch.update(d.ref, { status: 'seen' }));
        await batch.commit();

        const messageIds = snap.docs.map((d) => d.id);
        if (messageIds.length > 0) {
          io.to(senderId).emit('bulkStatusUpdate', { messageIds, status: 'seen' });
        }
      } catch (err) {
        console.error('bulkSeen error:', err);
      }
    });

    // ─── Delete for Everyone ──────────────────────────────────────────────────
    socket.on('deleteForEveryone', async ({ messageId, receiverId }) => {
      try {
        await db.collection('messages').doc(messageId).update({
          deleted: true, text: '', imageUrl: '',
        });
        io.to(receiverId).emit('messageDeleted', { messageId, scope: 'everyone' });
        socket.emit('messageDeleted', { messageId, scope: 'everyone' });
      } catch (err) {
        console.error('deleteForEveryone error:', err);
      }
    });

    // ─── Delete for Me (local only) ───────────────────────────────────────────
    socket.on('deleteForMe', async ({ messageId }) => {
      try {
        await db.collection('messages').doc(messageId).update({
          deletedFor: FieldValue.arrayUnion(uid),
        });
        // Only notify the requester
        socket.emit('messageDeletedForMe', { messageId });
      } catch (err) {
        console.error('deleteForMe error:', err);
      }
    });

    // ─── React to Message ─────────────────────────────────────────────────────
    socket.on('reactMessage', async ({ messageId, emoji, receiverId }) => {
      try {
        const ref = db.collection('messages').doc(messageId);
        const snap = await ref.get();
        if (!snap.exists) return;
        const reactions = snap.data().reactions || {};

        // Remove user from any existing emoji first (one reaction per user)
        Object.keys(reactions).forEach((e) => {
          reactions[e] = reactions[e].filter((u) => u !== uid);
          if (reactions[e].length === 0) delete reactions[e];
        });

        // Toggle: if same emoji clicked again, just remove (already removed above)
        // If different emoji, add it
        const alreadyHadThis = (snap.data().reactions?.[emoji] || []).includes(uid);
        if (!alreadyHadThis) {
          reactions[emoji] = [...(reactions[emoji] || []), uid];
        }

        await ref.update({ reactions });
        const payload = { messageId, reactions };
        io.to(receiverId).emit('messageReacted', payload);
        socket.emit('messageReacted', payload);
      } catch (err) {
        console.error('React error:', err);
      }
    });

    // ─── Forward Message ──────────────────────────────────────────────────────
    socket.on('forwardMessage', async ({ text, imageUrl, toUserId }) => {
      try {
        const chatId = getChatId(uid, toUserId);
        const msgRef = db.collection('messages').doc();
        const message = {
          id: msgRef.id,
          chatId,
          senderId: uid,
          receiverId: toUserId,
          text: text || '',
          imageUrl: imageUrl || '',
          status: 'sent',
          deleted: false,
          deletedFor: [],
          reactions: {},
          replyTo: null,
          forwarded: true,
          createdAt: new Date().toISOString(),
        };
        await msgRef.set({ ...message, createdAt: new Date() });
        io.to(toUserId).emit('newMessage', message);
        socket.emit('newMessage', message);

        // Delivered check
        const receiverSockets = await io.in(toUserId).fetchSockets();
        if (receiverSockets.length > 0) {
          await msgRef.update({ status: 'delivered' });
          socket.emit('messageStatusUpdate', { messageId: msgRef.id, status: 'delivered' });
        }
      } catch (err) {
        console.error('forwardMessage error:', err);
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      db.collection('users').doc(uid).update({
        online: false,
        lastSeen: new Date().toISOString(),
      }).catch(() => {});
    });
  });
};
