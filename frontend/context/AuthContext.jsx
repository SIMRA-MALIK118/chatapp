'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import api from '@/services/api';
import { connectSocket, disconnectSocket } from '@/services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Firebase user object
  const [profile, setProfile] = useState(null); // Firestore user document
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Reload to get the latest profile (photoURL may have just been set via updateProfile)
        await firebaseUser.reload();
        const freshUser = auth.currentUser;

        setUser(freshUser);
        // Temporary fallback — will be replaced by Firestore data below
        // Don't set photoURL here since Firebase Auth doesn't store our base64 photo
        setProfile((prev) => prev ?? {
          uid: freshUser.uid,
          name: freshUser.displayName || freshUser.email?.split('@')[0],
          email: freshUser.email,
          photoURL: '',
        });
        const syncWithRetry = async (retries = 3) => {
          const token = await freshUser.getIdToken();
          for (let i = 0; i < retries; i++) {
            try {
              const res = await api.post('/api/auth/sync', {
                displayName: freshUser.displayName,
                photoURL: freshUser.photoURL || '',
              });
              setProfile(res.data);
              connectSocket(token);
              return;
            } catch (err) {
              if (i < retries - 1) await new Promise(r => setTimeout(r, 3000));
              else console.warn('Backend sync failed:', err.message);
            }
          }
        };
        syncWithRetry();
      } else {
        setUser(null);
        setProfile(null);
        disconnectSocket();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    disconnectSocket();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
