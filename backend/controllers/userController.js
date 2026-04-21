import { db } from '../config/firebaseAdmin.js';

// GET /api/users/search?q=name
export const searchUsers = async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) return res.json([]);

  const query = q.trim().toLowerCase();
  const snapshot = await db.collection('users').get();

  const results = snapshot.docs
    .map((d) => d.data())
    .filter((u) =>
      u.uid !== req.user.uid &&
      (u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query))
    )
    .map(({ uid, name, email, photoURL, online, lastSeen }) =>
      ({ uid, name, email, photoURL, online, lastSeen })
    );

  res.json(results);
};

// GET /api/users/:uid — get a single user's public profile
export const getUserProfile = async (req, res) => {
  const { uid } = req.params;
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return res.status(404).json({ error: 'User not found' });

  const { uid: id, name, email, photoURL, online, lastSeen } = snap.data();
  res.json({ uid: id, name, email, photoURL, online, lastSeen });
};

// PATCH /api/users/me — update own profile (name or photo)
export const updateMyProfile = async (req, res) => {
  const { displayName, photoURL, bio } = req.body;
  const uid = req.user.uid;
  const updates = {};

  if (displayName?.trim()) updates.name = displayName.trim();
  if (photoURL !== undefined) updates.photoURL = photoURL;
  if (bio !== undefined) updates.bio = bio;

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: 'Nothing to update' });

  await db.collection('users').doc(uid).update(updates);
  const snap = await db.collection('users').doc(uid).get();
  res.json(snap.data());
};

// POST /api/users/:uid/block — block a user
export const blockUser = async (req, res) => {
  const { uid: targetUid } = req.params;
  const uid = req.user.uid;
  if (targetUid === uid) return res.status(400).json({ error: 'Cannot block yourself' });

  await db.collection('users').doc(uid).set(
    { blockedUsers: { [targetUid]: true } },
    { merge: true }
  );
  res.json({ success: true, blocked: targetUid });
};

// DELETE /api/users/:uid/block — unblock a user
export const unblockUser = async (req, res) => {
  const { uid: targetUid } = req.params;
  const uid = req.user.uid;

  const { FieldValue } = await import('firebase-admin/firestore');
  await db.collection('users').doc(uid).update({
    [`blockedUsers.${targetUid}`]: FieldValue.delete(),
  });
  res.json({ success: true, unblocked: targetUid });
};

// GET /api/users/contacts — get current user's contacts with full profiles
export const getContacts = async (req, res) => {
  const uid = req.user.uid;
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return res.json([]);

  const contactUids = snap.data().contacts || [];
  if (contactUids.length === 0) return res.json([]);

  const results = await Promise.all(
    contactUids.map(async (cuid) => {
      const s = await db.collection('users').doc(cuid).get();
      if (!s.exists) return null;
      const { uid: id, name, email, photoURL, online, lastSeen } = s.data();
      return { uid: id, name, email, photoURL, online, lastSeen };
    })
  );
  res.json(results.filter(Boolean));
};

// POST /api/users/:uid/contact — add a user to contacts
export const addContact = async (req, res) => {
  const { uid: targetUid } = req.params;
  const uid = req.user.uid;
  if (targetUid === uid) return res.status(400).json({ error: 'Cannot add yourself' });

  const { FieldValue } = await import('firebase-admin/firestore');
  await db.collection('users').doc(uid).update({
    contacts: FieldValue.arrayUnion(targetUid),
  });
  res.json({ success: true, added: targetUid });
};

// DELETE /api/users/:uid/contact — remove a user from contacts
export const removeContact = async (req, res) => {
  const { uid: targetUid } = req.params;
  const uid = req.user.uid;

  const { FieldValue } = await import('firebase-admin/firestore');
  await db.collection('users').doc(uid).update({
    contacts: FieldValue.arrayRemove(targetUid),
  });
  res.json({ success: true, removed: targetUid });
};
