import { db } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

// POST /api/messages
export const saveMessage = async (req, res) => {
  const { receiverId, text, imageUrl, audioUrl, replyTo } = req.body;
  const senderId = req.user.uid;

  if (!receiverId) return res.status(400).json({ error: 'receiverId required' });
  if (!text && !imageUrl && !audioUrl) return res.status(400).json({ error: 'text, imageUrl, or audioUrl required' });

  const chatId = getChatId(senderId, receiverId);
  const msgRef = db.collection('messages').doc();

  const message = {
    id: msgRef.id,
    chatId,
    senderId,
    receiverId,
    text: text || '',
    imageUrl: imageUrl || '',
    audioUrl: audioUrl || '',
    status: 'sent',
    deleted: false,
    deletedFor: [],       // uids who deleted "for me"
    reactions: {},
    replyTo: replyTo || null,
    createdAt: FieldValue.serverTimestamp(),
  };

  await msgRef.set(message);
  res.status(201).json({ ...message, createdAt: new Date().toISOString() });
};

// GET /api/messages/:receiverId
export const getMessages = async (req, res) => {
  const { receiverId } = req.params;
  const senderId = req.user.uid;
  const chatId = getChatId(senderId, receiverId);

  const snapshot = await db.collection('messages').where('chatId', '==', chatId).get();

  const messages = snapshot.docs
    .map((d) => {
      const data = d.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json(messages);
};

// GET /api/messages/last-conversations
export const getLastConversations = async (req, res) => {
  const uid = req.user.uid;

  const [sentSnap, recvSnap] = await Promise.all([
    db.collection('messages').where('senderId', '==', uid).get(),
    db.collection('messages').where('receiverId', '==', uid).get(),
  ]);

  const allDocs = [...sentSnap.docs, ...recvSnap.docs];
  const latestByChat = {};

  for (const doc of allDocs) {
    const data = doc.data();
    const peerId = data.senderId === uid ? data.receiverId : data.senderId;
    const msgTime = data.createdAt?.toMillis?.() ?? 0;
    if (!latestByChat[peerId] || msgTime > latestByChat[peerId]._time) {
      latestByChat[peerId] = {
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        _time: msgTime,
      };
    }
  }

  const result = {};
  for (const [peerId, msg] of Object.entries(latestByChat)) {
    const { _time, ...clean } = msg;
    result[peerId] = clean;
  }

  res.json(result);
};

// DELETE /api/messages/:messageId?scope=everyone|me
export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const { scope = 'everyone' } = req.query; // 'everyone' or 'me'
  const uid = req.user.uid;

  const ref = db.collection('messages').doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Message not found' });

  const msg = snap.data();

  if (scope === 'everyone') {
    // Only sender can delete for everyone
    if (msg.senderId !== uid) return res.status(403).json({ error: 'Only sender can delete for everyone' });
    await ref.update({ deleted: true, text: '', imageUrl: '' });
    res.json({ success: true, scope: 'everyone' });
  } else {
    // Anyone can delete for themselves
    await ref.update({ deletedFor: FieldValue.arrayUnion(uid) });
    res.json({ success: true, scope: 'me' });
  }
};

// PATCH /api/messages/:messageId/react
export const reactToMessage = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const uid = req.user.uid;

  const ref = db.collection('messages').doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Message not found' });

  const reactions = snap.data().reactions || {};
  const users = reactions[emoji] || [];
  const updated = users.includes(uid) ? users.filter((u) => u !== uid) : [...users, uid];

  if (updated.length === 0) delete reactions[emoji];
  else reactions[emoji] = updated;

  await ref.update({ reactions });
  const updatedSnap = await ref.get();
  res.json({ reactions: updatedSnap.data().reactions });
};
