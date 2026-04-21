'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/services/socket';
import api from '@/services/api';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null); // message being forwarded
  const typingTimeoutRef = useRef(null);
  const selectedUserRef = useRef(null);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  // ─── Fetch contacts ──────────────────────────────────────────────────────────
  const fetchContacts = () => {
    api.get('/api/users/contacts').then((r) => setUsers(r.data)).catch(console.error);
  };
  const fetchLastConversations = () => {
    api.get('/api/messages/last-conversations')
      .then((r) => setLastMessages(r.data))
      .catch(console.error);
  };
  useEffect(() => {
    if (!user) return;
    fetchContacts();
    fetchLastConversations();
    const t1 = setTimeout(fetchContacts, 2000);
    const t2 = setTimeout(fetchContacts, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [user]);

  const addContact = async (targetUid) => {
    await api.post(`/api/users/${targetUid}/contact`);
    fetchContacts();
  };

  const removeContact = async (targetUid) => {
    await api.delete(`/api/users/${targetUid}/contact`);
    fetchContacts();
  };

  // ─── Load messages + bulk seen ──────────────────────────────────────────────
  useEffect(() => {
    if (!selectedUser) return;
    setMessages([]);
    setUnreadCounts((prev) => ({ ...prev, [selectedUser.uid]: 0 }));

    api.get(`/api/messages/${selectedUser.uid}`).then((r) => {
      setMessages(r.data);
      if (r.data.length > 0) {
        setLastMessages((prev) => ({ ...prev, [selectedUser.uid]: r.data[r.data.length - 1] }));
      }
      // Mark all unread messages from this user as seen
      const socket = getSocket();
      socket?.emit('bulkSeen', { senderId: selectedUser.uid });
    }).catch(console.error);
  }, [selectedUser]);

  // ─── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = (msg) => {
      const activePeer = selectedUserRef.current;
      const peerId = msg.senderId === user?.uid ? msg.receiverId : msg.senderId;
      setLastMessages((prev) => ({ ...prev, [peerId]: msg }));

      if (activePeer?.uid === msg.senderId || activePeer?.uid === msg.receiverId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        const s = getSocket();
        if (msg.senderId === activePeer?.uid) {
          s?.emit('messageSeen', { messageId: msg.id, senderId: msg.senderId });
        }
      } else if (msg.senderId !== user?.uid) {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    };

    const handleTyping = ({ senderId }) => {
      if (senderId === selectedUserRef.current?.uid) setIsTyping(true);
    };
    const handleStopTyping = ({ senderId }) => {
      if (senderId === selectedUserRef.current?.uid) setIsTyping(false);
    };
    const handleStatusUpdate = ({ messageId, status }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, status } : m));
    };
    const handleBulkStatusUpdate = ({ messageIds, status }) => {
      setMessages((prev) => prev.map((m) =>
        messageIds.includes(m.id) ? { ...m, status } : m
      ));
    };
    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, deleted: true, text: '', imageUrl: '' } : m
      ));
      setLastMessages((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((uid) => {
          if (updated[uid]?.id === messageId) {
            updated[uid] = { ...updated[uid], deleted: true, text: '', imageUrl: '' };
          }
        });
        return updated;
      });
    };
    const handleMessageDeletedForMe = ({ messageId }) => {
      setMessages((prev) => prev.map((m) =>
        m.id === messageId
          ? { ...m, deletedFor: [...(m.deletedFor || []), user.uid] }
          : m
      ));
      setLastMessages((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((uid) => {
          if (updated[uid]?.id === messageId) {
            updated[uid] = { ...updated[uid], deletedFor: [...(updated[uid].deletedFor || []), user.uid] };
          }
        });
        return updated;
      });
    };
    const handleMessageReacted = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    };

    const attach = (s) => {
      s.on('newMessage', handleNewMessage);
      s.on('typing', handleTyping);
      s.on('stopTyping', handleStopTyping);
      s.on('messageStatusUpdate', handleStatusUpdate);
      s.on('bulkStatusUpdate', handleBulkStatusUpdate);
      s.on('messageDeleted', handleMessageDeleted);
      s.on('messageDeletedForMe', handleMessageDeletedForMe);
      s.on('messageReacted', handleMessageReacted);
    };

    const detach = (s) => {
      s.off('newMessage', handleNewMessage);
      s.off('typing', handleTyping);
      s.off('stopTyping', handleStopTyping);
      s.off('messageStatusUpdate', handleStatusUpdate);
      s.off('bulkStatusUpdate', handleBulkStatusUpdate);
      s.off('messageDeleted', handleMessageDeleted);
      s.off('messageDeletedForMe', handleMessageDeletedForMe);
      s.off('messageReacted', handleMessageReacted);
    };

    // Attach immediately if socket exists, else poll until available
    let pollInterval = null;
    let currentSocket = getSocket();
    if (currentSocket) {
      attach(currentSocket);
    } else {
      pollInterval = setInterval(() => {
        const s = getSocket();
        if (s) {
          clearInterval(pollInterval);
          pollInterval = null;
          currentSocket = s;
          attach(s);
        }
      }, 500);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      const s = getSocket();
      if (s) detach(s);
    };
  }, [user]);

  // ─── Send text message ──────────────────────────────────────────────────────
  const sendMessage = async (text, toUser) => {
    const target = toUser || selectedUser;
    if (!target) return;
    const socket = getSocket();
    const body = { receiverId: target.uid, text };
    if (!toUser && replyTo) body.replyTo = replyTo;
    const res = await api.post('/api/messages', body);
    const savedMsg = res.data;
    if (!toUser) setMessages((prev) => [...prev, savedMsg]);
    setLastMessages((prev) => ({ ...prev, [target.uid]: savedMsg }));
    socket?.emit('sendMessage', savedMsg);
    if (!toUser) setReplyTo(null);
  };

  // ─── Send voice message ─────────────────────────────────────────────────────
  const sendVoiceMessage = async (audioUrl) => {
    if (!selectedUser) return;
    const socket = getSocket();
    const res = await api.post('/api/messages', { receiverId: selectedUser.uid, text: '', audioUrl });
    const savedMsg = res.data;
    setMessages((prev) => [...prev, savedMsg]);
    setLastMessages((prev) => ({ ...prev, [selectedUser.uid]: savedMsg }));
    socket?.emit('sendMessage', savedMsg);
  };

  // ─── Send image message ─────────────────────────────────────────────────────
  const sendImageMessage = async (imageUrl, toUser) => {
    const target = toUser || selectedUser;
    if (!target) return;
    const socket = getSocket();
    const body = { receiverId: target.uid, text: '', imageUrl };
    if (!toUser && replyTo) body.replyTo = replyTo;
    const res = await api.post('/api/messages', body);
    const savedMsg = res.data;
    if (!toUser) setMessages((prev) => [...prev, savedMsg]);
    setLastMessages((prev) => ({ ...prev, [target.uid]: savedMsg }));
    socket?.emit('sendMessage', savedMsg);
    if (!toUser) setReplyTo(null);
  };

  // ─── Delete for Everyone ─────────────────────────────────────────────────────
  const updateLastIfMatch = (messageId, patch) => {
    setLastMessages((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((uid) => {
        if (updated[uid]?.id === messageId) updated[uid] = { ...updated[uid], ...patch };
      });
      return updated;
    });
  };

  const deleteForEveryone = (messageId) => {
    const socket = getSocket();
    const patch = { deleted: true, text: '', imageUrl: '' };
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, ...patch } : m));
    updateLastIfMatch(messageId, patch);
    socket?.emit('deleteForEveryone', { messageId, receiverId: selectedUser?.uid });
  };

  // ─── Delete for Me ───────────────────────────────────────────────────────────
  const deleteForMe = (messageId) => {
    const socket = getSocket();
    const patch = { deletedFor: [...(messages.find(m => m.id === messageId)?.deletedFor || []), user.uid] };
    setMessages((prev) => prev.map((m) =>
      m.id === messageId ? { ...m, ...patch } : m
    ));
    updateLastIfMatch(messageId, patch);
    socket?.emit('deleteForMe', { messageId });
  };

  // ─── Forward message ─────────────────────────────────────────────────────────
  const forwardMessage = (toUserId) => {
    if (!forwardMsg) return;
    const socket = getSocket();
    socket?.emit('forwardMessage', {
      text: forwardMsg.text,
      imageUrl: forwardMsg.imageUrl,
      toUserId,
    });
    setForwardMsg(null);
  };

  // ─── React to message ────────────────────────────────────────────────────────
  const reactToMessage = (messageId, emoji) => {
    const socket = getSocket();
    socket?.emit('reactMessage', { messageId, emoji, receiverId: selectedUser?.uid });
  };

  // ─── Typing ──────────────────────────────────────────────────────────────────
  const emitTyping = () => {
    const socket = getSocket();
    if (!socket || !selectedUser) return;
    socket.emit('typing', { receiverId: selectedUser.uid });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { receiverId: selectedUser.uid });
    }, 1500);
  };

  const selectUser = (u) => {
    setSelectedUser(u);
    if (u) setUnreadCounts((prev) => ({ ...prev, [u.uid]: 0 }));
    setReplyTo(null);
  };

  return (
    <ChatContext.Provider value={{
      users, selectedUser, setSelectedUser: selectUser,
      messages, isTyping, lastMessages, unreadCounts,
      replyTo, setReplyTo,
      forwardMsg, setForwardMsg,
      sendMessage, sendImageMessage, sendVoiceMessage,
      deleteForEveryone, deleteForMe,
      forwardMessage, reactToMessage, emitTyping,
      addContact, removeContact,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
};
