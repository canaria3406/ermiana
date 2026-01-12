import express from 'express';
import { BilibiliService } from '../services/bilibiliService.js';

const router = express.Router();

/**
 * GET /api/v1/bilibili/:opusId
 * Get Bilibili opus data
 */
router.get('/:opusId', async (req, res, next) => {
  try {
    const { opusId } = req.params;

    if (!opusId || !/^\d+$/.test(opusId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid opus ID',
          code: 'INVALID_PARAMETER',
        },
      });
    }

    const result = await BilibiliService.getOpusData(opusId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
