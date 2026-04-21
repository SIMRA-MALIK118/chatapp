import { Router } from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { createStatus, getStatuses, viewStatus, deleteStatus } from '../controllers/statusController.js';

const router = Router();

router.get('/', verifyToken, getStatuses);
router.post('/', verifyToken, createStatus);
router.post('/:id/view', verifyToken, viewStatus);
router.delete('/:id', verifyToken, deleteStatus);

export default router;
