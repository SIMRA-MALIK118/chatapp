import { body, param, validationResult } from 'express-validator';

// Run validation and return 400 if errors
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

export const validateMessage = [
  body('receiverId').notEmpty().withMessage('receiverId is required'),
  body('text').optional().isString().trim().isLength({ max: 2000 }).withMessage('Message too long (max 2000 chars)'),
  body('imageUrl').optional().isString(),
  validate,
];

export const validateReaction = [
  body('emoji').notEmpty().isString().isLength({ max: 8 }).withMessage('Invalid emoji'),
  param('messageId').notEmpty().withMessage('messageId required'),
  validate,
];

export const validateSync = [
  body('displayName').optional().isString().trim().isLength({ max: 60 }).withMessage('Name too long'),
  body('photoURL').optional().isString(),
  validate,
];
