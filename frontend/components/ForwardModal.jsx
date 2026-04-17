'use client';
import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { X, Search, Send } from 'lucide-react';

export default function ForwardModal() {
  const { users, forwardMsg, setForwardMsg, forwardMessage } = useChat();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  if (!forwardMsg) return null;

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleForward = () => {
    if (!selected) return;
    forwardMessage(selected.uid);
    setSelected(null);
    setSearch('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) { setForwardMsg(null); setSelected(null); } }}>
      <div className="bg-[#111128] border border-[#2a2a45] rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a45]">
          <h3 className="font-semibold text-white">Forward message</h3>
          <button onClick={() => { setForwardMsg(null); setSelected(null); }}
            className="text-gray-500 hover:text-gray-300 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message preview */}
        <div className="mx-5 mt-4 px-3 py-2 bg-[#1e1e3a] border-l-2 border-purple-500 rounded-lg text-sm text-gray-400 truncate">
          {forwardMsg.text || (forwardMsg.imageUrl ? '📷 Photo' : '')}
        </div>

        {/* Search */}
        <div className="px-5 mt-4">
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

        {/* User list */}
        <div className="mt-3 max-h-56 overflow-y-auto px-2">
          {filtered.map((u) => (
            <button
              key={u.uid}
              onClick={() => setSelected(u)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition
                ${selected?.uid === u.uid ? 'bg-purple-600/20 border border-purple-500' : 'hover:bg-[#1e1e3a]'}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-purple-900
                flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                {u.photoURL
                  ? <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                  : u.name?.[0]?.toUpperCase()
                }
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{u.name}</p>
                {u.online && <p className="text-xs text-green-400">Online</p>}
              </div>
              {selected?.uid === u.uid && (
                <div className="ml-auto w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Forward button */}
        <div className="px-5 py-4">
          <button
            onClick={handleForward}
            disabled={!selected}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm
              transition bg-purple-600 hover:bg-purple-700 disabled:bg-[#2a2a45] disabled:text-gray-600 text-white"
          >
            <Send className="w-4 h-4" />
            {selected ? `Forward to ${selected.name}` : 'Select a contact'}
          </button>
        </div>
      </div>
    </div>
  );
}
