'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { format } from 'date-fns';
import { Check, CheckCheck, Reply, Copy, Forward, Trash2, ChevronDown, Mic } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const toDate = (createdAt) => {
  if (!createdAt) return new Date();
  if (typeof createdAt.toDate === 'function') return createdAt.toDate();
  if (createdAt._seconds) return new Date(createdAt._seconds * 1000);
  return new Date(createdAt);
};

const StatusIcon = ({ status }) => {
  if (status === 'seen')     return <CheckCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  if (status === 'delivered') return <CheckCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />;
  return <Check className="w-4 h-4 text-gray-500 flex-shrink-0" />;
};

/* ── Audio player ── */
function AudioPlayer({ src, isMine, senderPhoto, senderName }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const BARS = 30;
  const heights = useRef(
    Array.from({ length: BARS }, () => 20 + Math.random() * 80)
  ).current;

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] py-0.5">
      <audio ref={audioRef} src={src}
        onTimeUpdate={() => {
          const t = audioRef.current?.currentTime || 0;
          const d = audioRef.current?.duration || 1;
          setProgress((t / d) * 100);
          setCurrentTime(t);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }} />

      {/* Play/Pause button */}
      <button onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition
          ${isMine ? 'bg-white/25 hover:bg-white/35' : 'bg-purple-600 hover:bg-purple-700'}`}>
        {playing
          ? <span className="flex gap-[3px] items-center">
              {[0,1].map(i => <span key={i} className="w-[3px] h-4 bg-white rounded-full" />)}
            </span>
          : <span className="ml-0.5 text-white text-sm">▶</span>}
      </button>

      {/* Waveform + time */}
      <div className="flex-1 flex flex-col gap-1.5">
        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] h-5 cursor-pointer"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - r.left) / r.width;
            if (audioRef.current) audioRef.current.currentTime = pct * audioRef.current.duration;
          }}>
          {heights.map((h, i) => {
            const filled = (i / BARS) * 100 < progress;
            return (
              <div key={i}
                className={`w-[3px] rounded-full flex-shrink-0 transition-colors
                  ${filled
                    ? isMine ? 'bg-white' : 'bg-purple-400'
                    : isMine ? 'bg-white/30' : 'bg-gray-600'}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        {/* Duration */}
        <span className={`text-[10px] ${isMine ? 'text-purple-200/80' : 'text-gray-500'}`}>
          {fmt(playing ? currentTime : duration)}
        </span>
      </div>

      {/* Sender avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-900
        flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden border-2
        border-white/20">
        {senderPhoto
          ? <img src={senderPhoto} alt={senderName} className="w-full h-full object-cover" />
          : <span>{senderName?.[0]?.toUpperCase() || '?'}</span>}
      </div>
    </div>
  );
}

/* ── Reaction pills ── */
function ReactionBar({ reactions, messageId, isMine }) {
  const { reactToMessage } = useChat();
  const { user } = useAuth();
  if (!reactions || Object.keys(reactions).length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {Object.entries(reactions).map(([emoji, users]) => (
        <button key={emoji} onClick={() => reactToMessage(messageId, emoji)}
          className={`reaction-pop flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition
            ${users.includes(user.uid)
              ? 'bg-purple-600/30 border-purple-500 text-white'
              : 'bg-[#1a1a2e] border-[#2a2a45] text-gray-300 hover:border-purple-400'}`}>
          {emoji}{users.length > 1 && <span className="ml-0.5 text-[10px]">{users.length}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Image preview ── */
function ImagePreview({ src }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img src={src} alt="shared" className="chat-image mt-1" onClick={() => setOpen(true)} />
      {open && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <img src={src} alt="full" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}

/* ── Fixed dropdown menu ── */
function DropdownMenu({ pos, isMine, onClose, onReply, onCopy, onForward, onDeleteForMe, onDeleteForEveryone, hasText }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const top = Math.min(pos.y, window.innerHeight - 280);
  const left = isMine
    ? Math.max(4, pos.x - 176)
    : Math.min(pos.x, window.innerWidth - 180);

  return (
    <div ref={ref} style={{ position: 'fixed', top, left, zIndex: 200 }}
      className="w-44 bg-[#1a1a2e] border border-[#2a2a45] rounded-2xl shadow-2xl overflow-hidden fade-in">
      <div className="py-1">
        {[
          { icon: <Reply className="w-4 h-4"/>, label: 'Reply', fn: onReply },
          hasText && { icon: <Copy className="w-4 h-4"/>, label: 'Copy', fn: onCopy },
          { icon: <Forward className="w-4 h-4"/>, label: 'Forward', fn: onForward },
        ].filter(Boolean).map(({ icon, label, fn }) => (
          <button key={label} onClick={() => { fn(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-[#2a2a45] transition text-left">
            {icon}{label}
          </button>
        ))}
        <div className="h-px bg-[#2a2a45] my-1" />
        {isMine && (
          <button onClick={() => { onDeleteForEveryone(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition text-left">
            <Trash2 className="w-4 h-4" />Delete for everyone
          </button>
        )}
        <button onClick={() => { onDeleteForMe(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition text-left">
          <Trash2 className="w-4 h-4" />Delete for me
        </button>
      </div>
    </div>
  );
}

/* ── Main Message component ── */
export default function Message({ message, senderChanged }) {
  const { user, profile } = useAuth();
  const { deleteForEveryone, deleteForMe, reactToMessage, setReplyTo, setForwardMsg, users } = useChat();
  const isMine = message.senderId === user.uid;
  const date = toDate(message.createdAt);

  const [hovered, setHovered] = useState(false);
  const [dropPos, setDropPos] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bubbleRef = useRef(null);
  const longPressRef = useRef(null);

  if (message.deletedFor?.includes(user.uid)) return null;

  if (message.deleted) {
    return (
      <div className={`flex mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className="px-3.5 py-2 rounded-2xl text-xs text-gray-500 italic border border-[#2a2a45]/50 bg-[#111128]">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  const openDrop = () => {
    if (!bubbleRef.current) return;
    const r = bubbleRef.current.getBoundingClientRect();
    setDropPos({ x: isMine ? r.right : r.left, y: r.bottom + 4 });
  };

  const handleReply = () => {
    const senderName = isMine ? 'You' : (users.find(u => u.uid === message.senderId)?.name || 'User');
    setReplyTo({ id: message.id, text: message.text, imageUrl: message.imageUrl, senderName });
  };
  const handleCopy = () => { if (message.text) navigator.clipboard.writeText(message.text).catch(() => {}); };
  const handleForward = () => setForwardMsg({ text: message.text, imageUrl: message.imageUrl });

  const handleTouchStart = () => { longPressRef.current = setTimeout(openDrop, 500); };
  const handleTouchEnd = () => clearTimeout(longPressRef.current);

  return (
    <>
      <div
        className={`flex my-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowEmojiPicker(false); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        <div className="max-w-[85%] sm:max-w-[70%] relative" ref={bubbleRef}>

          {/* Hover toolbar — emoji bar above bubble */}
          {hovered && (
            <div className={`absolute -top-10 fade-in z-30
              flex items-center gap-1
              bg-[#1e1e3a] border border-[#2a2a45] rounded-full px-2 py-1.5 shadow-xl
              ${isMine ? 'right-0' : 'left-0'}
              max-w-[calc(100vw-2rem)]`}>
              {QUICK_REACTIONS.map((e) => (
                <button key={e} onClick={() => reactToMessage(message.id, e)}
                  className="text-base hover:scale-125 transition-transform leading-none">
                  {e}
                </button>
              ))}
              <div className="w-px h-4 bg-[#2a2a45] mx-0.5" />
              <button onClick={openDrop}
                className="w-6 h-6 flex items-center justify-center rounded-full
                  text-gray-400 hover:text-white hover:bg-[#3a3a55] transition">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Forwarded label */}
          {message.forwarded && (
            <div className={`flex items-center gap-1 text-[10px] text-gray-500 mb-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
              <Forward className="w-3 h-3" /><span>Forwarded</span>
            </div>
          )}

          {/* Reply preview */}
          {message.replyTo && (
            <div className={`text-xs px-2.5 py-1.5 rounded-t-xl mb-0.5 border-l-2 border-purple-400
              ${isMine ? 'bg-purple-900/40 text-purple-200' : 'bg-[#16162a] text-gray-400'}`}>
              <span className="font-semibold text-purple-300 block text-[11px]">{message.replyTo.senderName}</span>
              <span className="truncate block max-w-[220px] opacity-80">
                {message.replyTo.text || (message.replyTo.imageUrl ? '📷 Photo' : '🎤 Voice')}
              </span>
            </div>
          )}

          {/* Bubble */}
          <div className={`px-3.5 py-2 shadow-md text-sm
            ${message.replyTo ? 'rounded-b-2xl rounded-tl-none' : 'rounded-2xl'}
            ${isMine
              ? 'bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-br-sm'
              : 'bg-[#1e1e3a] text-gray-100 rounded-bl-sm border border-[#2a2a45]'
            }`}>
            {message.imageUrl && <ImagePreview src={message.imageUrl} />}
            {message.audioUrl && (
              <AudioPlayer
                src={message.audioUrl}
                isMine={isMine}
                senderPhoto={isMine ? profile?.photoURL : users.find(u => u.uid === message.senderId)?.photoURL}
                senderName={isMine ? profile?.name : users.find(u => u.uid === message.senderId)?.name}
              />
            )}
            {message.text ? (
              <p className="leading-relaxed break-words whitespace-pre-wrap">
                {message.text}
                {' '}
                <span className={`inline-flex items-center gap-0.5 text-[10px] align-bottom ml-1 ${isMine ? 'text-purple-200/80' : 'text-gray-500'}`}
                      style={{ verticalAlign: 'text-bottom', lineHeight: 1 }}>
                  {format(date, 'h:mm a')}
                  {isMine && <StatusIcon status={message.status} />}
                </span>
              </p>
            ) : (
              <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <span className={`text-[10px] ${isMine ? 'text-purple-200/80' : 'text-gray-500'}`}>
                  {format(date, 'h:mm a')}
                </span>
                {isMine && <StatusIcon status={message.status} />}
              </div>
            )}
          </div>

          <ReactionBar reactions={message.reactions} messageId={message.id} isMine={isMine} />
        </div>
      </div>

      {dropPos && (
        <DropdownMenu
          pos={dropPos}
          isMine={isMine}
          hasText={!!message.text}
          onClose={() => setDropPos(null)}
          onReply={handleReply}
          onCopy={handleCopy}
          onForward={handleForward}
          onDeleteForMe={() => deleteForMe(message.id)}
          onDeleteForEveryone={() => deleteForEveryone(message.id)}
        />
      )}
    </>
  );
}
