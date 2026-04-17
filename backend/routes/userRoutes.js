import { Router } from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { searchUsers, getUserProfile, updateMyProfile, blockUser, unblockUser } from '../controllers/userController.js';

const router = Router();

router.get('/search', verifyToken, searchUsers);
router.get('/me', verifyToken, (req, res) => getUserProfile({ ...req, params: { uid: req.user.uid } }, res));
router.patch('/me', verifyToken, updateMyProfile);
router.get('/:uid', verifyToken, getUserProfile);
router.post('/:uid/block', verifyToken, blockUser);
router.delete('/:uid/block', verifyToken, unblockUser);

export default router;
