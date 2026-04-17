'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, Eye, EyeOff, Loader2, X, Mail } from 'lucide-react';

function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      setError(msgs[err.code] || 'Failed to send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111128] border border-[#2a2a45] rounded-2xl p-6 w-full max-w-sm shadow-2xl fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Reset Password</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-white font-semibold mb-2">Email Sent!</p>
            <p className="text-gray-400 text-sm">
              Password reset link sent to <span className="text-purple-400">{email}</span>. Check your inbox.
            </p>
            <button onClick={onClose}
              className="mt-5 w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition text-sm">
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-5">
              Enter your email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleReset} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl
                  text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition text-sm"
              />
              {error && (
                <div className="bg-red-900/30 text-red-400 text-sm px-4 py-3 rounded-xl border border-red-800">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-purple-600
                  text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/home');
    } catch (err) {
      const msgs = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      };
      setError(msgs[err.code] || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-900 rounded-full blur-[100px] opacity-30" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-700 rounded-full blur-[100px] opacity-20" />
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#111128] border border-[#2a2a45] rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-purple-600 p-3 rounded-2xl mb-4 shadow-lg shadow-purple-900">
              <MessageCircle className="text-white w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-400">Password</label>
                <button type="button" onClick={() => setShowForgot(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 transition">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
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
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-purple-400 font-medium hover:text-purple-300 transition">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
