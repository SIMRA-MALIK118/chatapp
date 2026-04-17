'use client';
import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { Search, Users } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const formatLastTime = (createdAt) => {
  if (!createdAt) return '';
  const date = typeof createdAt === 'string' ? new Date(createdAt)
    : createdAt._seconds ? new Date(createdAt._seconds * 1000)
    : new Date();
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yest.';
  return format(date, 'dd/MM/yy');
};

function Avatar({ user, size = 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-11 h-11 text-base';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-purple-600 to-purple-900
      flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden`}>
      {user.photoURL
        ? <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
        : user.name?.[0]?.toUpperCase() || '?'
      }
    </div>
  );
}

function UserItem({ user, isSelected, onClick, lastMessage, unreadCount }) {
  const { user: me } = useAuth();
  const isMine = lastMessage?.senderId === me?.uid;
  const isDeleted = lastMessage?.deleted;

  let preview = 'Start a conversation';
  if (lastMessage) {
    if (isDeleted) preview = '🚫 Message deleted';
    else if (lastMessage.imageUrl && !lastMessage.text) preview = isMine ? 'You: 📷 Photo' : '📷 Photo';
    else if (lastMessage.text) preview = isMine ? `You: ${lastMessage.text}` : lastMessage.text;
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left relative
        ${isSelected
          ? 'bg-gradient-to-r from-purple-900/40 to-transparent border-l-2 border-purple-500'
          : 'border-l-2 border-transparent hover:bg-[#16162a]'
        }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar user={user} />
        {user.online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#111128] rounded-full online-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
            {user.name}
          </p>
          {lastMessage && (
            <span className={`text-[10px] flex-shrink-0 ml-1 ${unreadCount > 0 ? 'text-purple-400' : 'text-gray-600'}`}>
              {formatLastTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${unreadCount > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
            {preview}
          </p>
          {unreadCount > 0 && (
            <span className="badge-pulse ml-1 bg-purple-600 text-white text-[10px] font-bold
              rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Sidebar() {
  const { users, selectedUser, setSelectedUser, lastMessages, unreadCounts } = useChat();
  const { user: currentUser, profile } = useAuth();
  const [search, setSearch] = useState('');

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );
  const onlineCount = users.filter(u => u.online).length;

  return (
    <aside className={`bg-[#111128] border-r border-[#2a2a45] flex flex-col
      flex-shrink-0 transition-all duration-200
      ${selectedUser
        ? 'hidden md:flex md:w-80'
        : 'flex w-full md:w-80'}`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#2a2a45]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white text-base">Contacts</h2>
          {onlineCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              {onlineCount} online
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-[#1e1e3a] border border-[#2a2a45] rounded-xl
              text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1e1e3a] flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-gray-500 text-sm">
              {search ? 'No contacts found' : 'No contacts yet'}
            </p>
            {!search && (
              <p className="text-gray-600 text-xs mt-1">Other users will appear here</p>
            )}
          </div>
        ) : (
          filtered.map((u) => (
            <UserItem
              key={u.uid}
              user={u}
              isSelected={selectedUser?.uid === u.uid}
              onClick={() => setSelectedUser(u)}
              lastMessage={lastMessages[u.uid]}
              unreadCount={unreadCounts[u.uid] || 0}
            />
          ))
        )}
      </div>

      {/* My profile footer */}
      {profile && (
        <div className="border-t border-[#2a2a45] px-4 py-3 bg-[#0d0d20] flex items-center gap-3">
          <div className="relative">
            <Avatar user={profile} size="sm" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-[#0d0d20] rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate">{profile.name}</p>
            <p className="text-[10px] text-green-400">● Online</p>
          </div>
        </div>
      )}
    </aside>
  );
}
