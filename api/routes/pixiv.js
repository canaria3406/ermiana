import express from 'express';
import { PixivService } from '../services/pixivService.js';

const router = express.Router();

/**
 * GET /api/v1/pixiv/:illustId
 * Get Pixiv illustration data
 */
router.get('/:illustId', async (req, res, next) => {
  try {
    const { illustId } = req.params;

    if (!illustId || !/^\d+$/.test(illustId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid illustration ID',
          code: 'INVALID_PARAMETER',
        },
      });
    }

    const result = await PixivService.getIllustData(illustId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
