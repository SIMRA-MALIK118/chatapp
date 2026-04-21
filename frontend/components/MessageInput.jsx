'use client';
import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { Send, Loader2, Smile, ImagePlus, X, Mic, Square } from 'lucide-react';

const EMOJIS = ['😊','😂','❤️','👍','🔥','😍','🥺','😭','✨','🎉','💯','👏','🙏','😎','💪','🤔','😅','🫶','💀','🤣'];

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 480;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function MessageInput() {
  const { sendMessage, sendImageMessage, sendVoiceMessage, emitTyping, replyTo, setReplyTo } = useChat();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState('');

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => () => { clearInterval(timerRef.current); }, []);

  const handleSend = async () => {
    if (!text.trim() && !imageBase64) return;
    // Refocus immediately so keyboard stays open on mobile
    textareaRef.current?.focus();
    setSending(true);
    setShowEmoji(false);
    try {
      if (imageBase64) {
        await sendImageMessage(imageBase64);
        setImageBase64(''); setImagePreview(null);
      }
      if (text.trim()) {
        await sendMessage(text.trim());
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
      textareaRef.current?.focus();
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const addEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const b64 = await compressImage(file);
      setImageBase64(b64); setImagePreview(b64);
    } catch { console.error('Compress failed'); }
    e.target.value = '';
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => sendVoiceMessage && sendVoiceMessage(reader.result);
        reader.readAsDataURL(blob);
        setRecordSecs(0);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSecs(0);
      timerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    } catch (err) {
      alert('Microphone access denied. Please allow microphone in browser settings.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
    }
    clearInterval(timerRef.current);
    setRecording(false);
    setRecordSecs(0);
  };

  const fmtSecs = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const canSend = (text.trim() || imageBase64) && !sending;

  // Recording UI
  if (recording) {
    return (
      <div className="bg-[#111128] border-t border-[#2a2a45] px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Cancel */}
          <button onClick={cancelRecording}
            className="p-2.5 rounded-xl text-red-400 hover:bg-red-900/20 transition flex-shrink-0">
            <X className="w-5 h-5" />
          </button>

          {/* Recording indicator */}
          <div className="flex-1 flex items-center gap-3 bg-[#1e1e3a] border border-[#2a2a45] rounded-2xl px-4 py-2.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
            <div className="flex gap-0.5 items-end h-6 flex-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i}
                  className="w-1 bg-purple-500 rounded-full opacity-70"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animation: `typingBounce ${0.8 + Math.random() * 0.6}s infinite ${i * 0.05}s`
                  }} />
              ))}
            </div>
            <span className="text-sm text-red-400 font-mono flex-shrink-0">{fmtSecs(recordSecs)}</span>
          </div>

          {/* Send recording */}
          <button onClick={stopRecording}
            className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition flex-shrink-0 shadow-lg shadow-purple-900/40">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111128] border-t border-[#2a2a45] px-2 sm:px-3 pt-2 pb-3
      flex-shrink-0 relative safe-bottom">

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 bg-[#1e1e3a] border-l-2 border-purple-500
          rounded-lg px-3 py-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-400">{replyTo.senderName}</p>
            <p className="text-xs text-gray-400 truncate">
              {replyTo.text || (replyTo.imageUrl ? '📷 Photo' : '🎤 Voice')}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-gray-300 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="relative inline-block mb-2">
          <img src={imagePreview} alt="preview" className="h-20 rounded-xl object-cover border border-[#2a2a45]" />
          <button onClick={() => { setImagePreview(null); setImageBase64(''); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-auto mb-2
          bg-[#1e1e3a] border border-[#2a2a45] rounded-2xl p-3 shadow-xl
          flex flex-wrap gap-2 sm:w-72 fade-in z-20">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => addEmoji(e)}
              className="text-xl hover:scale-125 transition-transform">{e}</button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Input box: emoji | textarea | attachment + camera */}
        <div className="flex-1 flex items-end bg-[#1e1e3a] border border-[#2a2a45]
          rounded-3xl px-2 py-1 focus-within:border-purple-500 transition gap-1"
          onClick={() => textareaRef.current?.focus()}>

          {/* Emoji */}
          <button type="button" onClick={() => setShowEmoji(!showEmoji)}
            className={`p-2 rounded-full flex-shrink-0 transition self-end mb-0.5
              ${showEmoji ? 'text-purple-400' : 'text-gray-500 hover:text-purple-400'}`}>
            <Smile className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            onChange={(e) => {
              setText(e.target.value);
              emitTyping();
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            disabled={sending}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500
              focus:outline-none resize-none leading-relaxed py-2.5"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />

          {/* Attachment + Camera */}
          <div className="flex items-center gap-0.5 self-end mb-0.5 flex-shrink-0">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-gray-500 hover:text-purple-400 transition">
              <ImagePlus className="w-5 h-5" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>
        </div>

        {/* Mic / Send — circular purple button */}
        {canSend ? (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => { e.preventDefault(); handleSend(); }}
            onClick={handleSend}
            disabled={!canSend}
            className="w-11 h-11 bg-purple-600 hover:bg-purple-700 text-white rounded-full
              flex items-center justify-center flex-shrink-0 transition shadow-lg shadow-purple-900/40">
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        ) : (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={startRecording}
            className="w-11 h-11 bg-purple-600 hover:bg-purple-700 text-white rounded-full
              flex items-center justify-center flex-shrink-0 transition shadow-lg shadow-purple-900/40">
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
