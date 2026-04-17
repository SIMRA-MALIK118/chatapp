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

  // ─── Fetch users ────────────────────────────────────────────────────────────
  const fetchUsers = () => {
    api.get('/api/auth/users').then((r) => setUsers(r.data)).catch(console.error);
  };
  const fetchLastConversations = () => {
    api.get('/api/messages/last-conversations')
      .then((r) => setLastMessages(r.data))
      .catch(console.error);
  };
  useEffect(() => {
    if (!user) return;
    fetchUsers();
    fetchLastConversations();
    const t1 = setTimeout(fetchUsers, 2000);
    const t2 = setTimeout(fetchUsers, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [user]);

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
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg) => {
      const activePeer = selectedUserRef.current;
      const peerId = msg.senderId === user?.uid ? msg.receiverId : msg.senderId;
      setLastMessages((prev) => ({ ...prev, [peerId]: msg }));

      if (activePeer?.uid === msg.senderId || activePeer?.uid === msg.receiverId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderId === activePeer?.uid) {
          socket.emit('messageSeen', { messageId: msg.id, senderId: msg.senderId });
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
    const handleMessageDeleted = ({ messageId, scope }) => {
      setMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, deleted: true, text: '', imageUrl: '' } : m
      ));
    };
    const handleMessageDeletedForMe = ({ messageId }) => {
      setMessages((prev) => prev.map((m) =>
        m.id === messageId
          ? { ...m, deletedFor: [...(m.deletedFor || []), user.uid] }
          : m
      ));
    };
    const handleMessageReacted = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('messageStatusUpdate', handleStatusUpdate);
    socket.on('bulkStatusUpdate', handleBulkStatusUpdate);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('messageDeletedForMe', handleMessageDeletedForMe);
    socket.on('messageReacted', handleMessageReacted);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('messageStatusUpdate', handleStatusUpdate);
      socket.off('bulkStatusUpdate', handleBulkStatusUpdate);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('messageDeletedForMe', handleMessageDeletedForMe);
      socket.off('messageReacted', handleMessageReacted);
    };
  }, [user]);

  // ─── Send text message ──────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    if (!selectedUser) return;
    const socket = getSocket();
    const body = { receiverId: selectedUser.uid, text };
    if (replyTo) body.replyTo = replyTo;
    const res = await api.post('/api/messages', body);
    const savedMsg = res.data;
    setMessages((prev) => [...prev, savedMsg]);
    setLastMessages((prev) => ({ ...prev, [selectedUser.uid]: savedMsg }));
    socket?.emit('sendMessage', savedMsg);
    setReplyTo(null);
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
  const sendImageMessage = async (imageUrl) => {
    if (!selectedUser) return;
    const socket = getSocket();
    const body = { receiverId: selectedUser.uid, text: '', imageUrl };
    if (replyTo) body.replyTo = replyTo;
    const res = await api.post('/api/messages', body);
    const savedMsg = res.data;
    setMessages((prev) => [...prev, savedMsg]);
    setLastMessages((prev) => ({ ...prev, [selectedUser.uid]: savedMsg }));
    socket?.emit('sendMessage', savedMsg);
    setReplyTo(null);
  };

  // ─── Delete for Everyone ─────────────────────────────────────────────────────
  const deleteForEveryone = (messageId) => {
    const socket = getSocket();
    setMessages((prev) => prev.map((m) =>
      m.id === messageId ? { ...m, deleted: true, text: '', imageUrl: '' } : m
    ));
    socket?.emit('deleteForEveryone', { messageId, receiverId: selectedUser?.uid });
  };

  // ─── Delete for Me ───────────────────────────────────────────────────────────
  const deleteForMe = (messageId) => {
    const socket = getSocket();
    setMessages((prev) => prev.map((m) =>
      m.id === messageId
        ? { ...m, deletedFor: [...(m.deletedFor || []), user.uid] }
        : m
    ));
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
