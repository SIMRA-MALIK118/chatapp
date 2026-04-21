'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Camera, Loader2, CheckCircle } from 'lucide-react';
import api from '@/services/api';

export default function SetupProfile() {
  const { profile, setProfile } = useAuth();
  const router = useRouter();
  const fileRef = useRef(null);

  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photo, setPhoto] = useState(profile?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhoto(res.data.url);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await api.patch('/api/users/me', {
        displayName: name.trim(),
        photoURL: photo,
        bio: bio.trim(),
      });
      if (setProfile) setProfile(res.data);
      router.replace('/home');
    } catch (err) {
      console.error('Profile update failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 shadow-xl shadow-purple-900/50 mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set up your profile</h1>
          <p className="text-gray-500 text-sm mt-1">Add a photo and bio so others can find you</p>
        </div>

        <div className="bg-[#111128] border border-[#2a2a45] rounded-2xl p-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-purple-900
                flex items-center justify-center overflow-hidden border-4 border-[#2a2a45] cursor-pointer"
                onClick={() => fileRef.current?.click()}>
                {photo
                  ? <img src={photo} alt="profile" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-3xl">{name?.[0]?.toUpperCase() || '?'}</span>
                }
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full
                  flex items-center justify-center border-2 border-[#111128] hover:bg-purple-500 transition">
                {uploading
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Camera className="w-4 h-4 text-white" />}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            <p className="text-xs text-gray-500">Tap to upload photo</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Display Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={30}
              className="w-full bg-[#1e1e3a] border border-[#2a2a45] rounded-xl px-4 py-3
                text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Hey there! I am using Connectify"
              maxLength={100}
              rows={3}
              className="w-full bg-[#1e1e3a] border border-[#2a2a45] rounded-xl px-4 py-3
                text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 transition resize-none"
            />
            <p className="text-right text-xs text-gray-600 mt-1">{bio.length}/100</p>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50
              text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Saving...' : 'Continue'}
          </button>

          <button
            onClick={() => router.replace('/home')}
            className="w-full text-gray-500 text-sm hover:text-gray-400 transition py-1">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
