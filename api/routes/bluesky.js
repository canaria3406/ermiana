import express from 'express';
import { BlueskyService } from '../services/blueskyService.js';

const router = express.Router();

/**
 * GET /api/v1/bluesky/:handle/:postId
 * Get Bluesky post data
 */
router.get('/:handle/:postId', async (req, res, next) => {
  try {
    const { handle, postId } = req.params;

    if (!handle || !postId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid handle or post ID',
          code: 'INVALID_PARAMETER',
        },
      });
    }

    const result = await BlueskyService.getPostData(handle, postId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
