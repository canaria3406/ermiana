import express from 'express';
import { PlurkService } from '../services/plurkService.js';

const router = express.Router();

/**
 * GET /api/v1/plurk/:plurkId
 * Get Plurk post data
 */
router.get('/:plurkId', async (req, res, next) => {
  try {
    const { plurkId } = req.params;

    if (!plurkId || !/^[a-zA-Z0-9]{3,10}$/.test(plurkId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid plurk ID',
          code: 'INVALID_PARAMETER',
        },
      });
    }

    const result = await PlurkService.getPlurkData(plurkId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
