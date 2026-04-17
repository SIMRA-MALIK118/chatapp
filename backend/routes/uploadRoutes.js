import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/verifyToken.js';
import { cloudinary } from '../config/cloudinary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/upload/avatar
router.post('/avatar', verifyToken, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  // Convert buffer to base64 data URI and upload to Cloudinary
  const b64 = Buffer.from(req.file.buffer).toString('base64');
  const dataURI = `data:${req.file.mimetype};base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataURI, {
    folder: 'chat-app/avatars',
    transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
  });

  res.json({ url: result.secure_url });
});

export default router;
