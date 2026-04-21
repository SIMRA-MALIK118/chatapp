'use client';
import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import Message from './Message';
import MessageInput from './MessageInput';
import { ArrowLeft, ChevronDown, MessageCircle } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

function DateSeparator({ date }) {
  const label = isToday(date) ? 'Today'
    : isYesterday(date) ? 'Yesterday'
    : format(date, 'MMMM d, yyyy');
  return (
    <div className="flex items-center gap-3 my-4 px-2">
      <div className="flex-1 h-px bg-[#2a2a45]/60" />
      <span className="text-[10px] text-gray-500 bg-[#111128] border border-[#2a2a45] px-3 py-0.5 rounded-full">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#2a2a45]/60" />
    </div>
  );
}

function TypingIndicator({ name }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1 msg-theirs">
      <div className="bg-[#1e1e3a] border border-[#2a2a45] px-4 py-3 rounded-2xl rounded-bl-sm
        flex items-center gap-1.5">
        <span className="typing-dot w-2 h-2 bg-purple-400 rounded-full inline-block" />
        <span className="typing-dot w-2 h-2 bg-purple-400 rounded-full inline-block" />
        <span className="typing-dot w-2 h-2 bg-purple-400 rounded-full inline-block" />
      </div>
      <span className="text-xs text-gray-500">{name} is typing…</span>
    </div>
  );
}

const toDate = (createdAt) => {
  if (!createdAt) return new Date();
  if (createdAt._seconds) return new Date(createdAt._seconds * 1000);
  return new Date(createdAt);
};

export default function ChatWindow() {
  const { selectedUser, setSelectedUser, messages, isTyping } = useChat();
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (fromBottom < 200) {
      scrollToBottom();
      setNewMsgCount(0);
    } else {
      setNewMsgCount((n) => n + 1);
    }
  }, [messages]);

  useEffect(() => { if (isTyping) scrollToBottom(); }, [isTyping]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(fromBottom > 250);
    if (fromBottom < 100) setNewMsgCount(0);
  };

  // Empty state
  if (!selectedUser) {
    const features = [
      { icon: '💬', text: 'Real-time messaging' },
      { icon: '🎤', text: 'Voice messages' },
      { icon: '📷', text: 'Share images' },
      { icon: '😊', text: 'Emoji reactions' },
      { icon: '↩️', text: 'Reply & forward messages' },
      { icon: '✅', text: 'Seen & delivered status' },
      { icon: '🟢', text: 'Online presence & typing indicator' },
      { icon: '🗑️', text: 'Delete for me or everyone' },
    ];
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#0a0a14] relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-900/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative flex flex-col items-center text-center px-8 max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-purple-600 flex items-center justify-center mb-5 shadow-xl shadow-purple-900/50">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Connectify</h2>
          <p className="text-purple-400 text-sm font-medium mb-6">Fast · Secure · Real-time</p>

          <div className="grid grid-cols-2 gap-2.5 w-full mb-6">
            {features.map((f) => (
              <div key={f.text}
                className="flex items-center gap-2 bg-[#111128] border border-[#2a2a45]
                  rounded-xl px-3 py-2.5 text-left">
                <span className="text-base">{f.icon}</span>
                <span className="text-xs text-gray-400">{f.text}</span>
              </div>
            ))}
          </div>

          <p className="text-gray-600 text-xs">
            Select a contact from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  const grouped = [];
  let lastDate = null;
  let lastSenderId = null;
  for (const msg of messages) {
    const d = toDate(msg.createdAt);
    if (!lastDate || !isSameDay(lastDate, d)) {
      grouped.push({ type: 'separator', date: d, id: `sep-${d.toDateString()}` });
      lastDate = d;
      lastSenderId = null;
    }
    const senderChanged = lastSenderId !== null && lastSenderId !== msg.senderId;
    grouped.push({ type: 'message', msg, senderChanged });
    lastSenderId = msg.senderId;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a14] relative">
      {/* Header */}
      <div className="glass border-b border-[#2a2a45] px-4 py-3 flex items-center gap-3 flex-shrink-0 z-10">
        <button
          onClick={() => setSelectedUser(null)}
          className="md:hidden p-1.5 rounded-lg hover:bg-[#1e1e3a] text-gray-400 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-900
            flex items-center justify-center text-white font-bold overflow-hidden">
            {selectedUser.photoURL
              ? <img src={selectedUser.photoURL} alt={selectedUser.name} className="w-full h-full object-cover" />
              : selectedUser.name?.[0]?.toUpperCase()
            }
          </div>
          {selectedUser.online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#111128] rounded-full online-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{selectedUser.name}</p>
          <p className={`text-xs ${selectedUser.online ? 'text-green-400' : 'text-gray-500'}`}>
            {isTyping
              ? <span className="text-purple-400 animate-pulse">typing…</span>
              : selectedUser.online ? '● Online' : 'Offline'
            }
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-[#1a1a2e] flex items-center justify-center text-3xl">
              👋
            </div>
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-600 text-xs">Say hello to {selectedUser.name}!</p>
          </div>
        ) : (
          grouped.map((item) =>
            item.type === 'separator'
              ? <DateSeparator key={item.id} date={item.date} />
              : <Message key={item.msg.id} message={item.msg} senderChanged={item.senderChanged} />
          )
        )}

        {isTyping && <TypingIndicator name={selectedUser.name} />}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => { scrollToBottom(); setNewMsgCount(0); }}
          className="absolute bottom-20 right-4 w-10 h-10 bg-purple-600 hover:bg-purple-700
            rounded-full flex flex-col items-center justify-center shadow-lg shadow-purple-900/50
            transition z-10"
        >
          {newMsgCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px]
              font-bold rounded-full w-5 h-5 flex items-center justify-center badge-pulse">
              {newMsgCount > 9 ? '9+' : newMsgCount}
            </span>
          )}
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
      )}

      <MessageInput />
    </div>
  );
}
