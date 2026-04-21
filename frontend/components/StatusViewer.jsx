'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Eye, ChevronDown, Forward, Send, Check } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ShareSheet({ status, onClose }) {
  const { users, sendMessage, sendImageMessage } = useChat();
  const [sent, setSent] = useState({});
  const [sending, setSending] = useState(null);

  const handleShare = async (contact) => {
    setSending(contact.uid);
    try {
      if (status.type === 'image') {
        await sendImageMessage(status.content, contact);
      } else {
        await sendMessage(status.content, contact);
      }
      setSent((prev) => ({ ...prev, [contact.uid]: true }));
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/85 backdrop-blur-md rounded-t-2xl"
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-white text-sm font-semibold">
          <Forward className="w-4 h-4 text-purple-400" />
          Share Status
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white transition">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto py-2">
        {users.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-6">No contacts to share with</p>
        ) : (
          users.map((contact) => (
            <div key={contact.uid} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center
                text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                {contact.photoURL
                  ? <img src={contact.photoURL} alt={contact.name} className="w-full h-full object-cover" />
                  : contact.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{contact.name}</p>
                <p className="text-white/40 text-xs truncate">{contact.email}</p>
              </div>
              <button
                onClick={() => !sent[contact.uid] && handleShare(contact)}
                disabled={!!sent[contact.uid] || sending === contact.uid}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0
                  ${sent[contact.uid]
                    ? 'bg-green-600'
                    : 'bg-purple-600 hover:bg-purple-500'}`}>
                {sent[contact.uid]
                  ? <Check className="w-4 h-4 text-white" />
                  : <Send className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ViewersSheet({ status, onClose, onShareOpen }) {
  const [viewers, setViewers] = useState([]);
  const viewedBy = status.viewedBy || [];

  useEffect(() => {
    if (!viewedBy.length) return;
    Promise.all(
      viewedBy.map((uid) =>
        api.get(`/api/users/${uid}`).then((r) => r.data).catch(() => null)
      )
    ).then((results) => setViewers(results.filter(Boolean)));
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/85 backdrop-blur-md rounded-t-2xl"
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-white text-sm font-semibold">
          <Eye className="w-4 h-4 text-purple-400" />
          {viewedBy.length} {viewedBy.length === 1 ? 'View' : 'Views'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onShareOpen}
            title="Share status"
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs
              px-3 py-1.5 rounded-full transition">
            <Forward className="w-3.5 h-3.5" />
            Share
          </button>
          <button onClick={onClose} className="text-white/60 hover:text-white transition">
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto py-2">
        {viewedBy.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-6">No views yet</p>
        ) : viewers.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-4">Loading...</p>
        ) : (
          viewers.map((v) => (
            <div key={v.uid} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center
                text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                {v.photoURL
                  ? <img src={v.photoURL} alt={v.name} className="w-full h-full object-cover" />
                  : v.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{v.name}</p>
                <p className="text-white/40 text-xs">{v.email}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function StatusViewer({ groups, startIndex = 0, onClose, onDeleted }) {
  const { user } = useAuth();
  const [groupIdx, setGroupIdx] = useState(startIndex);
  const [statusIdx, setStatusIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [sheet, setSheet] = useState(null); // null | 'viewers' | 'share'
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef(null);
  const DURATION = 5000;

  const group = groups[groupIdx];
  const status = group?.statuses?.[statusIdx];
  const isOwn = group?.uid === user?.uid;

  useEffect(() => {
    if (sheet) {
      clearInterval(timerRef.current);
      return;
    }
    setProgress(0);
    clearInterval(timerRef.current);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= DURATION) advance();
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [groupIdx, statusIdx, sheet]);

  useEffect(() => {
    if (!status || isOwn) return;
    if (!status.viewedBy?.includes(user?.uid)) {
      api.post(`/api/status/${status.id}/view`).catch(() => {});
    }
  }, [status?.id]);

  const advance = () => {
    clearInterval(timerRef.current);
    setSheet(null);
    const statuses = groups[groupIdx]?.statuses || [];
    if (statusIdx < statuses.length - 1) {
      setStatusIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1);
      setStatusIdx(0);
    } else {
      onClose();
    }
  };

  const goBack = () => {
    clearInterval(timerRef.current);
    setSheet(null);
    if (statusIdx > 0) {
      setStatusIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1);
      setStatusIdx(0);
    }
  };

  const handleDelete = async () => {
    if (!status || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/api/status/${status.id}`);
      onDeleted?.(status.id);
      advance();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (!group || !status) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={onClose}>
      <div className="relative w-full max-w-sm h-full sm:h-[85vh] sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {group.statuses.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-none"
                style={{ width: i < statusIdx ? '100%' : i === statusIdx ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-0 right-0 z-20 flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/40 flex-shrink-0
            bg-purple-700 flex items-center justify-center text-white font-bold text-sm">
            {group.photoURL
              ? <img src={group.photoURL} alt={group.name} className="w-full h-full object-cover" />
              : group.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm drop-shadow">{isOwn ? 'My Status' : group.name}</p>
            <p className="text-white/60 text-xs">{timeAgo(status.createdAt)}</p>
          </div>
          <div className="flex items-center gap-1">
            {/* Share button — always visible */}
            <button onClick={() => setSheet(sheet === 'share' ? null : 'share')}
              className="text-white/70 hover:text-purple-400 transition p-1.5">
              <Forward className="w-5 h-5" />
            </button>
            {isOwn && (
              <button onClick={handleDelete} disabled={deleting}
                className="text-white/70 hover:text-red-400 transition p-1.5 disabled:opacity-40">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white transition p-1.5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center"
          style={{ background: status.type === 'text' ? status.backgroundColor : '#000' }}>
          {status.type === 'image' ? (
            <img src={status.content} alt="status" className="w-full h-full object-contain" />
          ) : (
            <p className="text-white text-2xl font-semibold text-center px-8 drop-shadow-lg leading-snug">
              {status.content}
            </p>
          )}
        </div>

        {/* Views button — own status, no sheet open */}
        {isOwn && !sheet && (
          <button onClick={() => setSheet('viewers')}
            className="absolute bottom-5 left-0 right-0 z-20 flex justify-center">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur px-4 py-2 rounded-full
              text-white/80 text-sm hover:bg-black/80 transition">
              <Eye className="w-4 h-4 text-purple-400" />
              {status.viewedBy?.length || 0} {status.viewedBy?.length === 1 ? 'view' : 'views'}
            </div>
          </button>
        )}

        {/* Sheets */}
        {sheet === 'viewers' && (
          <ViewersSheet
            status={status}
            onClose={() => setSheet(null)}
            onShareOpen={() => setSheet('share')}
          />
        )}
        {sheet === 'share' && (
          <ShareSheet
            status={status}
            onClose={() => setSheet(null)}
          />
        )}

        {/* Tap zones */}
        {!sheet && (
          <>
            <button className="absolute left-0 top-0 w-1/3 h-full z-10" onClick={goBack} />
            <button className="absolute right-0 top-0 w-1/3 h-full z-10" onClick={advance} />
          </>
        )}
      </div>
    </div>
  );
}
