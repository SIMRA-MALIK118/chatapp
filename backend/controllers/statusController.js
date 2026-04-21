import { db } from '../config/firebaseAdmin.js';

const STATUS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// POST /api/status — create a new status
export const createStatus = async (req, res) => {
  const uid = req.user.uid;
  const { type, content, backgroundColor } = req.body;
  if (!type || !content) return res.status(400).json({ error: 'type and content are required' });

  const now = Date.now();
  const doc = await db.collection('statuses').add({
    uid,
    type,        // 'text' | 'image'
    content,     // text string or image URL
    backgroundColor: backgroundColor || '#7c3aed',
    createdAt: now,
    expiresAt: now + STATUS_TTL_MS,
    viewedBy: [],
  });

  res.json({ id: doc.id, uid, type, content, backgroundColor, createdAt: now, expiresAt: now + STATUS_TTL_MS, viewedBy: [] });
};

// GET /api/status — get all active statuses from contacts + own
export const getStatuses = async (req, res) => {
  const uid = req.user.uid;
  const now = Date.now();

  // Get caller's contact list
  const userSnap = await db.collection('users').doc(uid).get();
  const contactUids = userSnap.exists ? (userSnap.data().contacts || []) : [];
  const allowedUids = [...new Set([uid, ...contactUids])];

  // Fetch all non-expired statuses
  const snap = await db.collection('statuses')
    .where('expiresAt', '>', now)
    .get();

  const statuses = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => allowedUids.includes(s.uid));

  // Group by uid, attach poster profile
  const grouped = {};
  for (const s of statuses) {
    if (!grouped[s.uid]) grouped[s.uid] = [];
    grouped[s.uid].push(s);
  }

  // Fetch profiles for each poster
  const result = await Promise.all(
    Object.entries(grouped).map(async ([posterUid, items]) => {
      const pSnap = await db.collection('users').doc(posterUid).get();
      const profile = pSnap.exists ? pSnap.data() : {};
      return {
        uid: posterUid,
        name: profile.name || 'Unknown',
        photoURL: profile.photoURL || '',
        statuses: items.sort((a, b) => a.createdAt - b.createdAt),
      };
    })
  );

  // Own statuses first, then others
  result.sort((a, b) => (a.uid === uid ? -1 : b.uid === uid ? 1 : 0));
  res.json(result);
};

// POST /api/status/:id/view — mark a status as viewed
export const viewStatus = async (req, res) => {
  const { id } = req.params;
  const uid = req.user.uid;
  const { FieldValue } = await import('firebase-admin/firestore');
  await db.collection('statuses').doc(id).update({
    viewedBy: FieldValue.arrayUnion(uid),
  });
  res.json({ success: true });
};

// DELETE /api/status/:id — delete own status
export const deleteStatus = async (req, res) => {
  const { id } = req.params;
  const uid = req.user.uid;
  const snap = await db.collection('statuses').doc(id).get();
  if (!snap.exists || snap.data().uid !== uid)
    return res.status(403).json({ error: 'Forbidden' });
  await db.collection('statuses').doc(id).delete();
  res.json({ success: true });
};
