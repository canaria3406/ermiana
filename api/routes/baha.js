import express from 'express';
import { BahaService } from '../services/bahaService.js';

const router = express.Router();

/**
 * GET /api/v1/baha/:postId
 * Get Bahamut forum post data
 */
router.get('/:postId', async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid post ID',
          code: 'INVALID_PARAMETER',
        },
      });
    }

    const result = await BahaService.getPostData(postId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
