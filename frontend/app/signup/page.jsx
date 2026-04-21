'use client';
export const dynamic = 'force-dynamic';
import { useState, useRef } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, Eye, EyeOff, Loader2, Camera } from 'lucide-react';

// Resize & compress image to base64 (128x128 JPEG ~15KB)
function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const SIZE = 128;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        // Center-crop to square
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    try {
      const b64 = await imageToBase64(file);
      setAvatarPreview(b64);
      setAvatarBase64(b64);
      setError('');
    } catch {
      setError('Could not process image. Try another file.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      // 1. Create Firebase account
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);

      // 2. Get token first (before updateProfile triggers onAuthStateChanged again)
      const token = await cred.user.getIdToken();

      // 3. Sync to Firestore WITH photo FIRST — so the photo is saved before any other sync can run
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: form.name,
          photoURL: avatarBase64 || '',
        }),
      });

      // 4. Update Firebase Auth displayName (this will trigger onAuthStateChanged again,
      //    but backend now protects photoURL from being overwritten)
      await updateProfile(cred.user, { displayName: form.name });

      router.push('/setup-profile');
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
      };
      setError(msgs[err.code] || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-900 rounded-full blur-[100px] opacity-30" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-700 rounded-full blur-[100px] opacity-20" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#111128] border border-[#2a2a45] rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="bg-purple-600 p-3 rounded-2xl mb-4 shadow-lg shadow-purple-900">
              <MessageCircle className="text-white w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create account</h1>
            <p className="text-gray-500 text-sm mt-1">Join the conversation</p>
          </div>

          {/* Avatar picker */}
          <div className="flex flex-col items-center mb-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#2a2a45] group-hover:border-purple-500 transition">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#1e1e3a] flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-500 group-hover:text-purple-400 transition" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
            <p className="text-xs text-gray-600 mt-2">
              {avatarPreview ? 'Click to change photo' : 'Add profile photo (optional)'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
              <input
                name="name" type="text" value={form.name} onChange={handleChange} required
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
              <input
                name="email" type="email" value={form.email} onChange={handleChange} required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  name="password" type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={handleChange} required
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition text-sm pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 text-red-400 text-sm px-4 py-3 rounded-xl border border-red-800">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-purple-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 font-medium hover:text-purple-300 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
