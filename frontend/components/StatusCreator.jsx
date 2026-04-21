'use client';
import { useState, useRef } from 'react';
import { X, Type, Image, Loader2 } from 'lucide-react';
import api from '@/services/api';

const BG_COLORS = [
  '#7c3aed', '#2563eb', '#dc2626', '#16a34a',
  '#d97706', '#db2777', '#0891b2', '#4f46e5',
  '#000000', '#1e1e3a',
];

function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 800;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function StatusCreator({ onClose, onCreated }) {
  const [tab, setTab] = useState('text'); // 'text' | 'image'
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#7c3aed');
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await imageToBase64(file);
    setImagePreview(b64);
  };

  const handlePost = async () => {
    const content = tab === 'text' ? text.trim() : imagePreview;
    if (!content) return;
    setLoading(true);
    try {
      const res = await api.post('/api/status', {
        type: tab,
        content,
        backgroundColor: bgColor,
      });
      onCreated?.(res.data);
      onClose();
    } catch (err) {
      console.error('Status post failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-[#111128] border border-[#2a2a45] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#2a2a45]">
          <h3 className="text-white font-semibold">Add Status</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a45]">
          {[['text', 'Text', Type], ['image', 'Photo', Image]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition
                ${tab === id ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {tab === 'text' ? (
            <>
              {/* Preview */}
              <div className="w-full h-40 rounded-xl flex items-center justify-center px-4 transition-colors"
                style={{ backgroundColor: bgColor }}>
                <p className="text-white text-lg font-semibold text-center break-words">
                  {text || 'Your status text...'}
                </p>
              </div>

              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="What's on your mind?"
                className="w-full bg-[#1e1e3a] border border-[#2a2a45] rounded-xl px-4 py-3
                  text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 transition resize-none"
              />

              {/* Color picker */}
              <div className="flex gap-2 flex-wrap">
                {BG_COLORS.map((c) => (
                  <button key={c} onClick={() => setBgColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full transition border-2
                      ${bgColor === c ? 'border-white scale-110' : 'border-transparent'}`} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                className="w-full h-48 rounded-xl border-2 border-dashed border-[#2a2a45] hover:border-purple-500
                  flex items-center justify-center cursor-pointer transition overflow-hidden">
                {imagePreview
                  ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  : <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Image className="w-8 h-8" />
                      <p className="text-sm">Tap to choose photo</p>
                    </div>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </>
          )}

          <button
            onClick={handlePost}
            disabled={loading || (tab === 'text' ? !text.trim() : !imagePreview)}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40
              text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Posting...' : 'Post Status'}
          </button>
        </div>
      </div>
    </div>
  );
}
