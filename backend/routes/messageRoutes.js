import { Router } from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { saveMessage, getMessages, deleteMessage, reactToMessage, getLastConversations } from '../controllers/messageController.js';

const router = Router();

router.post('/', verifyToken, saveMessage);
router.get('/last-conversations', verifyToken, getLastConversations);
router.get('/:receiverId', verifyToken, getMessages);
router.delete('/:messageId', verifyToken, deleteMessage);
router.patch('/:messageId/react', verifyToken, reactToMessage);

export default router;
