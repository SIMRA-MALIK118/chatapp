'use client';
import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function StatusViewer({ groups, startIndex = 0, onClose, onDeleted }) {
  const { user } = useAuth();
  const [groupIdx, setGroupIdx] = useState(startIndex);
  const [statusIdx, setStatusIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const DURATION = 5000;

  const group = groups[groupIdx];
  const status = group?.statuses?.[statusIdx];
  const isOwn = group?.uid === user?.uid;

  // Auto-advance progress bar
  useEffect(() => {
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
  }, [groupIdx, statusIdx]);

  // Mark viewed
  useEffect(() => {
    if (!status || isOwn) return;
    if (!status.viewedBy?.includes(user?.uid)) {
      api.post(`/api/status/${status.id}/view`).catch(() => {});
    }
  }, [status?.id]);

  const advance = () => {
    clearInterval(timerRef.current);
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
    if (statusIdx > 0) {
      setStatusIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1);
      setStatusIdx(0);
    }
  };

  const handleDelete = async () => {
    if (!status) return;
    await api.delete(`/api/status/${status.id}`);
    onDeleted?.(status.id);
    advance();
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
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < statusIdx ? '100%' : i === statusIdx ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-0 right-0 z-20 flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/40 flex-shrink-0 bg-purple-700 flex items-center justify-center text-white font-bold text-sm">
            {group.photoURL
              ? <img src={group.photoURL} alt={group.name} className="w-full h-full object-cover" />
              : group.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm drop-shadow">{isOwn ? 'My Status' : group.name}</p>
            <p className="text-white/60 text-xs">{timeAgo(status.createdAt)}</p>
          </div>
          {isOwn && (
            <button onClick={handleDelete} className="text-white/70 hover:text-red-400 transition p-1">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
            <X className="w-5 h-5" />
          </button>
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

        {/* Viewers count (own only) */}
        {isOwn && (
          <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-white/80 text-xs">
              <Eye className="w-3.5 h-3.5" />
              {status.viewedBy?.length || 0} views
            </div>
          </div>
        )}

        {/* Tap zones */}
        <button className="absolute left-0 top-0 w-1/3 h-full z-10" onClick={goBack} />
        <button className="absolute right-0 top-0 w-1/3 h-full z-10" onClick={advance} />
      </div>
    </div>
  );
}
