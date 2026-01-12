import express from 'express';
import { TwitterService } from '../services/twitterService.js';

const router = express.Router();

/**
 * GET /api/v1/twitter/:statusId
 * Get Twitter/X post data
 */
router.get('/:statusId', async (req, res, next) => {
  try {
    const { statusId } = req.params;

    if (!statusId || !/^\d+$/.test(statusId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid status ID',
          code: 'INVALID_PARAMETER',
        },
      });
    }

    const result = await TwitterService.getPostData(statusId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
