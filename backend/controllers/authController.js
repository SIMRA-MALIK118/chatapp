import { db } from '../config/firebaseAdmin.js';

// POST /api/auth/sync — called after Firebase client login/signup
// Upserts the user document in Firestore with merge:true so existing fields survive on login
export const syncUser = async (req, res) => {
  const { uid, email, name, picture } = req.user; // from verifyToken middleware
  const { displayName, photoURL } = req.body;      // richer data from client

  const userData = {
    uid,
    email,
    name: displayName || name || email.split('@')[0],
    online: true,
    lastSeen: new Date().toISOString(),
  };

  // Only set photoURL if a real value is provided — never overwrite existing photo with empty string
  const incomingPhoto = photoURL || picture || '';
  if (incomingPhoto) {
    userData.photoURL = incomingPhoto;
  }

  await db.collection('users').doc(uid).set(userData, { merge: true });

  // Ensure photoURL field exists (default empty string if never set)
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data().photoURL === undefined) {
    await db.collection('users').doc(uid).set({ photoURL: '' }, { merge: true });
  }

  const snap = await db.collection('users').doc(uid).get();
  res.json(snap.data());
};

// GET /api/auth/users — returns all users except the current one
export const getAllUsers = async (req, res) => {
  const snapshot = await db.collection('users').get();
  const users = snapshot.docs
    .map((d) => d.data())
    .filter((u) => u.uid !== req.user.uid);
  res.json(users);
};
