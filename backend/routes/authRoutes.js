import { Router } from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { syncUser, getAllUsers } from '../controllers/authController.js';

const router = Router();

router.post('/sync', verifyToken, syncUser);
// Disable caching so fresh user list is always returned
router.get('/users', verifyToken, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
}, getAllUsers);

export default router;
