'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MessageCircle, LogOut, ChevronDown } from 'lucide-react';

function Avatar({ profile }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-900
      flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
      {profile.photoURL
        ? <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
        : profile.name?.[0]?.toUpperCase()
      }
    </div>
  );
}

export default function Navbar() {
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a45]
      bg-[#111128] z-20 flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="bg-purple-600 p-1.5 rounded-lg shadow-md shadow-purple-900/50">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg text-white tracking-tight">ChatApp</span>
      </div>

      {/* User menu */}
      {profile && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 hover:bg-[#1e1e3a] rounded-xl px-2 py-1.5 transition group"
          >
            <Avatar profile={profile} />
            <span className="text-sm text-gray-300 hidden sm:block group-hover:text-white transition">
              {profile.name}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[#1a1a2e] border border-[#2a2a45]
              rounded-2xl shadow-2xl overflow-hidden fade-in z-50">
              {/* Profile info */}
              <div className="px-4 py-3 border-b border-[#2a2a45]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-purple-900
                    flex items-center justify-center text-white font-bold flex-shrink-0">
                    {profile.photoURL
                      ? <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
                      : profile.name?.[0]?.toUpperCase()
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{profile.name}</p>
                    <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full online-pulse" />
                  <span className="text-xs text-green-400">Online</span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-1.5">
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                    text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
